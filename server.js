require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "clinica_medica",
    port: Number(process.env.DB_PORT || 3306)
});


const erro = (res, e) => {
    console.error(e.message);

    res.status(400).json({
        erro: "Não foi possível concluir. Confira os dados e os relacionamentos."
    });
};


app.get("/api/pacientes", async (req, res) => {
    try {
        const [r] = await db.query(
            "SELECT * FROM pacientes ORDER BY nome"
        );

        res.json(r);

    } catch (e) {
        erro(res, e);
    }
});


app.post("/api/pacientes", async (req, res) => {
    const {
        cpf,
        nome,
        data_nascimento,
        sexo,
        telefone,
        email,
        endereco
    } = req.body;

    if (!cpf || !nome) {
        return res.status(400).json({
            erro: "CPF e nome são obrigatórios"
        });
    }

    try {
        await db.query(
            `INSERT INTO pacientes
            (cpf, nome, data_nascimento, sexo, telefone, email, endereco)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                cpf,
                nome,
                data_nascimento || null,
                sexo || "",
                telefone || "",
                email || "",
                endereco || ""
            ]
        );

        res.json({
            mensagem: "Paciente cadastrado"
        });

    } catch (e) {
        erro(res, e);
    }
});


app.get("/api/especialidades", async (req, res) => {
    try {
        const [r] = await db.query(
            "SELECT * FROM especialidades ORDER BY nome"
        );

        res.json(r);

    } catch (e) {
        erro(res, e);
    }
});


app.get("/api/profissionais", async (req, res) => {
    try {
        const [r] = await db.query(
            `SELECT
                p.*,
                m.id AS medico_id,
                m.crm_numero,
                m.crm_uf,
                GROUP_CONCAT(e.nome SEPARATOR ', ') AS especialidades
            FROM profissionais p
            LEFT JOIN medicos m
                ON m.profissional_id = p.id
            LEFT JOIN medico_especialidade me
                ON me.medico_id = m.id
            LEFT JOIN especialidades e
                ON e.id = me.especialidade_id
            GROUP BY p.id`
        );

        res.json(r);

    } catch (e) {
        erro(res, e);
    }
});


app.post("/api/profissionais", async (req, res) => {
    const {
        nome,
        cpf,
        telefone,
        email,
        data_nascimento,
        registro_profissional,
        tipo_registro,
        crm_numero,
        crm_uf,
        especialidade_id
    } = req.body;

    if (!nome || !cpf || !registro_profissional) {
        return res.status(400).json({
            erro: "Nome, CPF e registro são obrigatórios"
        });
    }

    const c = await db.getConnection();

    try {
        await c.beginTransaction();

        const [p] = await c.query(
            `INSERT INTO profissionais
            (nome, cpf, telefone, email, data_nascimento,
            registro_profissional, tipo_registro)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                nome,
                cpf,
                telefone || "",
                email || "",
                data_nascimento || null,
                registro_profissional,
                tipo_registro
            ]
        );

        if (tipo_registro === "Médico") {
            if (!crm_numero || !crm_uf) {
                throw Error("Informe número e UF do CRM");
            }

            const [m] = await c.query(
                `INSERT INTO medicos
                (profissional_id, crm_numero, crm_uf)
                VALUES (?, ?, ?)`,
                [
                    p.insertId,
                    crm_numero,
                    crm_uf.toUpperCase()
                ]
            );

            if (especialidade_id) {
                await c.query(
                    `INSERT INTO medico_especialidade
                    (medico_id, especialidade_id)
                    VALUES (?, ?)`,
                    [m.insertId, especialidade_id]
                );
            }
        }

        await c.commit();

        res.json({
            mensagem: "Profissional cadastrado"
        });

    } catch (e) {
        await c.rollback();
        erro(res, e);

    } finally {
        c.release();
    }
});


app.get("/api/convenios", async (req, res) => {
    try {
        const [r] = await db.query(
            "SELECT * FROM convenios ORDER BY nome"
        );

        res.json(r);

    } catch (e) {
        erro(res, e);
    }
});


app.post("/api/convenios", async (req, res) => {
    const { nome } = req.body;

    if (!nome) {
        return res.status(400).json({
            erro: "Informe o nome"
        });
    }

    try {
        await db.query(
            "INSERT INTO convenios (nome) VALUES (?)",
            [nome]
        );

        res.json({
            mensagem: "Convênio cadastrado"
        });

    } catch (e) {
        erro(res, e);
    }
});


app.post("/api/paciente-convenio", async (req, res) => {
    const {
        paciente_id,
        convenio_id,
        numero_carteirinha,
        data_adesao,
        situacao
    } = req.body;

    try {
        await db.query(
            `INSERT INTO paciente_convenio
            (paciente_id, convenio_id, numero_carteirinha,
            data_adesao, situacao)
            VALUES (?, ?, ?, ?, ?)`,
            [
                paciente_id,
                convenio_id,
                numero_carteirinha,
                data_adesao,
                situacao || "Ativo"
            ]
        );

        res.json({
            mensagem: "Convênio vinculado"
        });

    } catch (e) {
        erro(res, e);
    }
});


app.get("/api/agendamentos", async (req, res) => {
    try {
        const [r] = await db.query(
            `SELECT
                a.*,
                p.nome AS paciente,
                pr.nome AS medico
            FROM agendamentos a
            JOIN pacientes p
                ON p.id = a.paciente_id
            JOIN medicos m
                ON m.id = a.medico_id
            JOIN profissionais pr
                ON pr.id = m.profissional_id
            ORDER BY a.data_agendamento, a.horario`
        );

        res.json(r);

    } catch (e) {
        erro(res, e);
    }
});


app.post("/api/agendamentos", async (req, res) => {
    const {
        paciente_id,
        medico_id,
        data_agendamento,
        horario,
        situacao
    } = req.body;

    try {
        await db.query(
            `INSERT INTO agendamentos
            (paciente_id, medico_id, data_agendamento, horario, situacao)
            VALUES (?, ?, ?, ?, ?)`,
            [
                paciente_id,
                medico_id,
                data_agendamento,
                horario,
                situacao || "Agendado"
            ]
        );

        res.json({
            mensagem: "Agendamento salvo"
        });

    } catch (e) {
        erro(res, e);
    }
});


app.patch("/api/agendamentos/:id", async (req, res) => {
    const { situacao } = req.body;
    const { id } = req.params;

    if (!["Agendado", "Realizado", "Cancelado"].includes(situacao)) {
        return res.status(400).json({
            erro: "Situação inválida"
        });
    }

    const c = await db.getConnection();

    try {
        await c.beginTransaction();

        await c.query(
            "UPDATE agendamentos SET situacao = ? WHERE id = ?",
            [situacao, id]
        );

        if (situacao === "Realizado") {
            const [a] = await c.query(
                `SELECT data_agendamento, horario
                FROM agendamentos
                WHERE id = ?`,
                [id]
            );

            if (a.length > 0) {
                await c.query(
                    `INSERT IGNORE INTO consultas
                    (agendamento_id, data_atendimento, horario)
                    VALUES (?, ?, ?)`,
                    [
                        id,
                        a[0].data_agendamento,
                        a[0].horario
                    ]
                );
            }
        }

        await c.commit();

        res.json({
            mensagem: "Situação atualizada"
        });

    } catch (e) {
        await c.rollback();
        erro(res, e);

    } finally {
        c.release();
    }
});


app.get("/api/consultas", async (req, res) => {
    try {
        const [r] = await db.query(
            `SELECT
                c.*,
                a.paciente_id,
                a.id AS agendamento_id,
                p.nome AS paciente,
                pr.nome AS medico
            FROM consultas c
            JOIN agendamentos a
                ON a.id = c.agendamento_id
            JOIN pacientes p
                ON p.id = a.paciente_id
            JOIN medicos m
                ON m.id = a.medico_id
            JOIN profissionais pr
                ON pr.id = m.profissional_id
            ORDER BY c.data_atendimento, c.horario`
        );

        res.json(r);

    } catch (e) {
        erro(res, e);
    }
});


app.get("/api/exames", async (req, res) => {
    try {
        const [r] = await db.query(
            "SELECT * FROM exames ORDER BY nome"
        );

        res.json(r);

    } catch (e) {
        erro(res, e);
    }
});


app.post("/api/exames", async (req, res) => {
    const { nome, descricao, tipo } = req.body;

    if (!nome) {
        return res.status(400).json({
            erro: "Informe o nome do exame"
        });
    }

    try {
        await db.query(
            `INSERT INTO exames (nome, descricao, tipo)
            VALUES (?, ?, ?)`,
            [
                nome,
                descricao || "",
                tipo || ""
            ]
        );

        res.json({
            mensagem: "Exame cadastrado"
        });

    } catch (e) {
        erro(res, e);
    }
});


app.get("/api/solicitacoes-exames", async (req, res) => {
    try {
        const [r] = await db.query(
            `SELECT
                s.*,
                p.nome AS paciente,
                e.nome AS exame
            FROM solicitacoes_exames s
            JOIN pacientes p
                ON p.id = s.paciente_id
            JOIN exames e
                ON e.id = s.exame_id
            ORDER BY s.data_solicitacao DESC`
        );

        res.json(r);

    } catch (e) {
        erro(res, e);
    }
});


app.post("/api/consultas/:id/exames", async (req, res) => {
    const {
        paciente_id,
        exame_id,
        data_solicitacao
    } = req.body;

    if (!paciente_id || !exame_id || !data_solicitacao) {
        return res.status(400).json({
            erro: "Preencha todos os campos da solicitação"
        });
    }

    try {
        const [r] = await db.query(
            `INSERT INTO solicitacoes_exames
            (paciente_id, consulta_id, exame_id, data_solicitacao)
            VALUES (?, ?, ?, ?)`,
            [
                paciente_id,
                req.params.id,
                exame_id,
                data_solicitacao
            ]
        );

        res.json({
            mensagem: "Exame solicitado",
            id: r.insertId
        });

    } catch (e) {
        erro(res, e);
    }
});


const port = process.env.PORT || 3000;


db.query("SELECT 1")
    .then(() => {
        app.listen(port, () => {
            console.log(
                "Sistema aberto em http://localhost:" + port
            );
        });
    })
    .catch(e => {
        console.error("Erro MySQL:", e.message);
        process.exit(1);
    });