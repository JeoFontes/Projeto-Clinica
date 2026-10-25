const $ = id => document.getElementById(id);

const msg = texto => {
    $("msg").textContent = texto;
};


async function api(url, opcoes = {}) {
    const resposta = await fetch(url, {
        headers: {
            "Content-Type": "application/json"
        },
        ...opcoes
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw Error(dados.erro || "Erro");
    }

    return dados;
}


const dados = formulario =>
    Object.fromEntries(new FormData(formulario).entries());


const esc = texto =>
    String(texto ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);


function tabela(id, colunas, linhas) {
    $(id).innerHTML =
        "<table>" +
            "<thead>" +
                "<tr>" +
                    colunas.map(coluna =>
                        "<th>" + coluna + "</th>"
                    ).join("") +
                "</tr>" +
            "</thead>" +
            "<tbody>" +
                linhas.map(linha =>
                    "<tr>" +
                        linha.map(valor =>
                            "<td>" + esc(valor) + "</td>"
                        ).join("") +
                    "</tr>"
                ).join("") +
            "</tbody>" +
        "</table>";
}


function opts(id, itens, nome) {
    $(id).innerHTML =
        '<option value="">Selecione ' + nome + '</option>' +
        itens.map(item =>
            `<option value="${item.id}">${esc(item.nome)}</option>`
        ).join("");
}


async function carregar() {
    try {
        const [
            pacientes,
            profissionais,
            especialidades,
            convenios,
            agendamentos,
            consultas,
            exames,
            solicitacoes
        ] = await Promise.all([
            api("/api/pacientes"),
            api("/api/profissionais"),
            api("/api/especialidades"),
            api("/api/convenios"),
            api("/api/agendamentos"),
            api("/api/consultas"),
            api("/api/exames"),
            api("/api/solicitacoes-exames")
        ]);

        const medicos = profissionais.filter(
            profissional => profissional.crm_numero
        );

        opts("especialidade", especialidades, "especialidade");
        opts("pacienteConvenio", pacientes, "paciente");
        opts("pacienteAg", pacientes, "paciente");
        opts("pacienteExame", pacientes, "paciente");
        opts("convenioSelect", convenios, "convênio");

        opts(
            "medicoAg",
            medicos.map(medico => ({
                id: medico.medico_id,
                nome: medico.nome
            })),
            "médico"
        );

        opts(
            "consultaExame",
            consultas.map(consulta => ({
                id: consulta.id,
                nome: consulta.id + " - " +
                    consulta.paciente + " / " +
                    consulta.medico
            })),
            "consulta"
        );

        opts("exameSelect", exames, "exame");


        tabela(
            "listaPacientes",
            ["Nome", "CPF", "Telefone", "E-mail"],
            pacientes.map(paciente => [
                paciente.nome,
                paciente.cpf,
                paciente.telefone,
                paciente.email
            ])
        );


        tabela(
            "listaProfissionais",
            ["Nome", "Tipo", "Registro", "CRM", "Especialidades"],
            profissionais.map(profissional => [
                profissional.nome,
                profissional.tipo_registro,
                profissional.registro_profissional,
                profissional.crm_numero
                    ? profissional.crm_numero + "/" + profissional.crm_uf
                    : "-",
                profissional.especialidades || "-"
            ])
        );


        tabela(
            "listaAgendamentos",
            ["Código", "Paciente", "Médico", "Data", "Horário", "Situação"],
            agendamentos.map(agendamento => [
                agendamento.id,
                agendamento.paciente,
                agendamento.medico,
                agendamento.data_agendamento,
                String(agendamento.horario).slice(0, 5),
                agendamento.situacao
            ])
        );


        tabela(
            "listaConsultas",
            ["Código", "Paciente", "Médico", "Data", "Horário"],
            consultas.map(consulta => [
                consulta.id,
                consulta.paciente,
                consulta.medico,
                consulta.data_atendimento,
                String(consulta.horario).slice(0, 5)
            ])
        );


        tabela(
            "listaExames",
            ["Nome", "Tipo", "Descrição"],
            exames.map(exame => [
                exame.nome,
                exame.tipo,
                exame.descricao
            ])
        );


        tabela(
            "listaSolicitacoes",
            [
                "Paciente",
                "Exame",
                "Solicitação",
                "Situação",
                "Realização",
                "Resultado"
            ],
            solicitacoes.map(solicitacao => [
                solicitacao.paciente,
                solicitacao.exame,
                solicitacao.data_solicitacao,
                solicitacao.situacao,
                solicitacao.data_realizacao,
                solicitacao.resultado
            ])
        );

    } catch (erro) {
        msg("Não foi possível carregar. Confira Node.js e MySQL.");
    }
}


$("tipo").onchange = () => {
    $("crm").style.display =
        $("tipo").value === "Médico" ? "grid" : "none";
};


async function enviar(id, url) {
    $(id).onsubmit = async evento => {
        evento.preventDefault();

        try {
            await api(url, {
                method: "POST",
                body: JSON.stringify(dados(evento.target))
            });

            evento.target.reset();

            msg("Cadastro realizado!");

            await carregar();

        } catch (erro) {
            msg(erro.message);
        }
    };
}


enviar("paciente", "/api/pacientes");
enviar("profissional", "/api/profissionais");
enviar("convenio", "/api/convenios");
enviar("vinculo", "/api/paciente-convenio");
enviar("agendamento", "/api/agendamentos");
enviar("exame", "/api/exames");


$("solicitarExame").onsubmit = async evento => {
    evento.preventDefault();

    const formulario = dados(evento.target);

    try {
        await api(
            "/api/consultas/" + formulario.consulta_id + "/exames",
            {
                method: "POST",
                body: JSON.stringify({
                    paciente_id: formulario.paciente_id,
                    exame_id: formulario.exame_id,
                    data_solicitacao: formulario.data_solicitacao
                })
            }
        );

        evento.target.reset();

        msg("Solicitação de exame registrada!");

        await carregar();

    } catch (erro) {
        msg(erro.message);
    }
};


carregar();