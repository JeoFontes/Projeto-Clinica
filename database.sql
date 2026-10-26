CREATE DATABASE IF NOT EXISTS clinica_medica;

USE clinica_medica;


CREATE TABLE especialidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(80) NOT NULL,
    descricao VARCHAR(255)
);


CREATE TABLE profissionais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    email VARCHAR(100),
    data_nascimento DATE,
    registro_profissional VARCHAR(40) NOT NULL,
    tipo_registro VARCHAR(30) NOT NULL
);


CREATE TABLE medicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profissional_id INT UNIQUE NOT NULL,
    crm_numero VARCHAR(30) NOT NULL,
    crm_uf CHAR(2) NOT NULL,

    FOREIGN KEY (profissional_id)
        REFERENCES profissionais(id)
);


CREATE TABLE medico_especialidade (
    medico_id INT NOT NULL,
    especialidade_id INT NOT NULL,

    PRIMARY KEY (medico_id, especialidade_id),

    FOREIGN KEY (medico_id)
        REFERENCES medicos(id),

    FOREIGN KEY (especialidade_id)
        REFERENCES especialidades(id)
);


CREATE TABLE pacientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    data_nascimento DATE,
    sexo VARCHAR(20),
    telefone VARCHAR(20),
    email VARCHAR(100),
    endereco VARCHAR(255)
);


CREATE TABLE convenios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL
);


CREATE TABLE paciente_convenio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    convenio_id INT NOT NULL,
    numero_carteirinha VARCHAR(50) NOT NULL,
    data_adesao DATE NOT NULL,
    situacao VARCHAR(20) NOT NULL,

    FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id),

    FOREIGN KEY (convenio_id)
        REFERENCES convenios(id)
);


CREATE TABLE agendamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    medico_id INT NOT NULL,
    data_agendamento DATE NOT NULL,
    horario TIME NOT NULL,
    situacao ENUM('Agendado', 'Realizado', 'Cancelado')
        DEFAULT 'Agendado',

    FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id),

    FOREIGN KEY (medico_id)
        REFERENCES medicos(id)
);


CREATE TABLE consultas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agendamento_id INT UNIQUE NOT NULL,
    data_atendimento DATE NOT NULL,
    horario TIME NOT NULL,
    observacoes TEXT,

    FOREIGN KEY (agendamento_id)
        REFERENCES agendamentos(id)
);


CREATE TABLE exames (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    tipo VARCHAR(60)
);


CREATE TABLE solicitacoes_exames (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    consulta_id INT NOT NULL,
    exame_id INT NOT NULL,
    data_solicitacao DATE NOT NULL,
    situacao ENUM('Solicitado', 'Realizado', 'Cancelado')
        DEFAULT 'Solicitado',
    data_realizacao DATE,
    resultado TEXT,

    FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id),

    FOREIGN KEY (consulta_id)
        REFERENCES consultas(id),

    FOREIGN KEY (exame_id)
        REFERENCES exames(id)
);


INSERT INTO especialidades (nome, descricao)
VALUES
    ('Cardiologia', 'Especialidade do coração'),
    ('Dermatologia', 'Especialidade da pele'),
    ('Ortopedia', 'Ossos e articulações'),
    ('Pediatria', 'Atendimento infantil'),
    ('Neurologia', 'Sistema nervoso'),
    ('Clínica Geral', 'Atendimento geral');