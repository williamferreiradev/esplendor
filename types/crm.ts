export type CrmStatus = 'novo' | 'em_contato' | 'qualificado' | 'convertido' | 'perdido';

export interface Cliente {
    id: string; // uuid
    name: string;
    remotejid: string; // unique (WhatsApp ID)
    about: string | null;
    created_at: string; // timestamp
    updated_at: string; // timestamp
    followUp: boolean; // default false
    Ativado: boolean; // default true
    followupEstagio: number; // bigint
    score: string | null;
    estagiokanbam: string; // default 'novo'
    estagiopergunta: string; // default 'nome'
    vertical: string; // default 'imobiliaria'
    qualification_data: string | null;
    is_qualified: boolean; // default false
    meeting_scheduled_at: string | null;
    last_followup: string | null;
    ultimamensagemusuario: string | null;
    media_url: string | null;
    stage?: string | null;
    stage_id?: number | null;
    phone?: string | null;
    metadata?: any;
    status_crm?: string;
    qualificado?: boolean;
    trava?: boolean;
    ultima_mensagem_at?: string | null;
    agent_active?: boolean | null;
    situacao_nome?: string | null;
    source?: string | null;
    expected_value?: number | null;
    ativo?: boolean | null;
    corretor_id?: string | null;
    tipo_imovel?: string | null;
    localizacao?: string | null;
    profissao?: string | null;
    tempo_trabalho?: string | null;
    renda_mensal?: number | null;
    tipo_renda?: string | null;
    doc_cpf?: boolean | null;
    doc_rg?: boolean | null;
    doc_certidao?: boolean | null;
    doc_residencia?: boolean | null;
    doc_carteira_trabalho?: boolean | null;
    doc_contracheque?: boolean | null;
    doc_movimentacao?: boolean | null;
    url_cpf?: string | null;
    url_rg?: string | null;
    url_certidao?: string | null;
    url_residencia?: string | null;
    url_contracheque?: string | null;
    url_carteira_trabalho?: string | null;
    url_movimentacao?: string | null;
    dataHandoff?: string | null;
    estado_civil?: string | null;
    endereco_atual?: string | null;
    last_followup_status?: string | null;
    last_mensagem_followup_at?: string | null;
    email?: string | null;
    statusdoc?: 'aguardando' | 'esperando' | 'aprovado' | 'rejeitado' | string | null;
    motivostatus?: string | null;
    cpf?: string | null;
}

export interface Relatorio {
    id: number;
    created_at: string;
    texto: string | null;
    lido: boolean;
}

export interface ChatHistory {
    id: number;
    session_id: string;
    message: any; // jsonb
}
