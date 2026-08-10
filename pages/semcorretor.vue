<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  Clock, 
  Search, 
  Download, 
  Eye, 
  MessageCircle, 
  Bot, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  UserX,
  X,
  Building,
  Filter
} from 'lucide-vue-next'
import LeadDetailsModal from '@/components/leads/LeadDetailsModal.vue'
import type { Cliente, CrmStatus } from '@/types/crm'
import { useSupabaseClient } from '#imports'

const { mainMargin } = useSidebarState()
const supabase = useSupabaseClient<any>()

// State
const leads = ref<any[]>([])
const stages = ref<any[]>([])
const loading = ref(true)
const error = ref<any>(null)
const showModal = ref(false)
const selectedLead = ref<Cliente | null>(null)

// Filters & Search
const searchText = ref('')
const selectedStage = ref<string>('todos')
const currentPage = ref(1)
const itemsPerPage = 15

// Fetch Data: all leads without broker (corretor_id is null)
const fetchLeads = async () => {
  loading.value = true
  error.value = null
  
  try {
    const { data: stagesData, error: stagesError } = await supabase
      .from('stage')
      .select('*')
      .order('id')
      
    if (stagesError) throw stagesError
    stages.value = stagesData || []

    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .is('corretor_id', null)
      .order('created_at', { ascending: false })
      
    if (leadsError) throw leadsError
    leads.value = leadsData || []
  } catch (err: any) {
    console.error('Erro ao buscar leads em espera:', err)
    error.value = err.message || err
  } finally {
    loading.value = false
  }
}

// Stage Helpers
const getStageName = (stageSlug?: string | null, stageId?: number | null) => {
  if (!stageSlug && !stageId) return 'Novo'
  const found = stages.value.find((s: any) => s.estagio === stageSlug || s.id === stageId)
  if (found) return found.estagio_name || found.descricao || found.estagio
  const map: Record<string, string> = {
    novo: 'Novo',
    em_atendimento: 'Em Atendimento',
    negociacao: 'Negociação',
    visita: 'Visita',
    fechado: 'Fechado',
    perdido: 'Perdido',
    qualificando: 'Qualificando',
    qualificado: 'Qualificado',
    agendado: 'Visita',
    convertido: 'Fechado'
  }
  return map[stageSlug || ''] || stageSlug || 'Novo'
}

const getStageBadgeClass = (stageSlug?: string | null, stageId?: number | null) => {
  const s = stageSlug || stages.value.find((st: any) => st.id === stageId)?.estagio || 'novo'
  switch (s) {
    case 'novo':
      return 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
    case 'em_atendimento':
    case 'qualificando':
    case 'em_contato':
      return 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20'
    case 'negociacao':
    case 'qualificado':
      return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
    case 'visita':
    case 'agendado':
      return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
    case 'fechado':
    case 'convertido':
      return 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20'
    case 'perdido':
      return 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'
    default:
      return 'bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-dark-border'
  }
}

// Stage counts computed for filter chips
const stageCounts = computed(() => {
  const counts: Record<string, number> = { todos: leads.value.length }
  leads.value.forEach((l: any) => {
    const st = l.stage || l.situacao_nome || 'novo'
    counts[st] = (counts[st] || 0) + 1
  })
  return counts
})

// Unified Filtered Leads (Search + Stage Filter)
const filteredLeads = computed(() => {
  let result = [...leads.value]

  // Stage filter
  if (selectedStage.value !== 'todos') {
    result = result.filter((l: any) => {
      const st = l.stage || l.situacao_nome || 'novo'
      return st === selectedStage.value || String(l.stage_id) === String(selectedStage.value)
    })
  }

  // Unified Search Text (name, phone, email, about, property code, etc.)
  if (searchText.value.trim()) {
    const query = searchText.value.toLowerCase().trim()
    result = result.filter((lead: any) => {
      const name = lead.name ? String(lead.name).toLowerCase() : ''
      const phone = lead.phone ? String(lead.phone).toLowerCase() : ''
      const remotejid = lead.remotejid ? String(lead.remotejid).toLowerCase() : ''
      const email = lead.email ? String(lead.email).toLowerCase() : ''
      const about = lead.about ? String(lead.about).toLowerCase() : ''
      const tipoImovel = lead.tipo_imovel ? String(lead.tipo_imovel).toLowerCase() : ''
      const localizacao = lead.localizacao ? String(lead.localizacao).toLowerCase() : ''
      const situacao = lead.situacao_nome ? String(lead.situacao_nome).toLowerCase() : ''
      const propertyCode = lead.metadata?.propertyCode ? String(lead.metadata.propertyCode).toLowerCase() : ''

      return (
        name.includes(query) ||
        phone.includes(query) ||
        remotejid.includes(query) ||
        email.includes(query) ||
        about.includes(query) ||
        tipoImovel.includes(query) ||
        localizacao.includes(query) ||
        situacao.includes(query) ||
        propertyCode.includes(query)
      )
    })
  }

  return result
})

// Pagination
const totalPages = computed(() => Math.max(1, Math.ceil(filteredLeads.value.length / itemsPerPage)))

const paginatedLeads = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredLeads.value.slice(start, start + itemsPerPage)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
})

const handleStageSelect = (stageKey: string) => {
  selectedStage.value = stageKey
  currentPage.value = 1
}

const clearSearch = () => {
  searchText.value = ''
  currentPage.value = 1
}

// Actions & Modal Handlers
const openLeadDetails = (lead: Cliente) => {
  selectedLead.value = lead
  showModal.value = true
}

const openChat = (leadId: string) => {
  navigateTo(`/chats?clientId=${leadId}`)
}

const handleStatusUpdate = async (id: string, newStage: any) => {
  let stageObj = newStage
  if (typeof newStage === 'string') {
    stageObj = stages.value.find((s: any) => s.estagio === newStage)
  }
  
  if (!stageObj) {
    console.error('Stage não encontrado:', newStage)
    return
  }

  const lead = leads.value.find((l: any) => l.id === id)
  if (lead) {
    lead.stage_id = stageObj.id
    lead.stage = stageObj.estagio
  }

  try {
    const { error: updateError } = await supabase.from('leads').update({
      stage_id: stageObj.id,
      stage: stageObj.estagio
    }).eq('id', id)
    
    if (updateError) {
      console.error('Erro ao atualizar status:', updateError)
    }
  } catch (err) {
    console.error('Erro ao atualizar status:', err)
  }
}

const handleNotesUpdate = async (id: string, notes: string) => {
  const lead = leads.value.find((l: any) => l.id === id)
  if (lead) {
    lead.about = notes
  }
  try {
    await supabase.from('leads').update({ about: notes }).eq('id', id)
  } catch (err) {
    console.error('Erro ao salvar observações:', err)
  }
}

// Export CSV
const downloadCSV = () => {
  const columns = [
    'id', 'name', 'phone', 'stage', 'agent_active', 'created_at', 'source', 'expected_value', 'about', 'ativo', 'stage_id', 'ultima_mensagem_at', 'corretor_id', 'tipo_imovel', 'localizacao', 'situacao_nome', 'profissao', 'tempo_trabalho', 'renda_mensal', 'tipo_renda', 'doc_cpf', 'doc_rg', 'doc_certidao', 'doc_residencia', 'doc_carteira_trabalho', 'doc_contracheque', 'doc_movimentacao', 'url_cpf', 'url_rg', 'url_certidao', 'url_residencia', 'url_contracheque', 'dataHandoff', 'estado_civil', 'endereco_atual', 'url_carteira_trabalho', 'url_movimentacao', 'last_followup_status', 'last_mensagem_followup_at'
  ]

  const escapeCSV = (value: any) => {
    if (value === null || value === undefined) return '""'
    const stringValue = String(value)
    return '"' + stringValue.replace(/"/g, '""') + '"'
  }

  const header = columns.join(',') + "\r\n"
  const rows = filteredLeads.value.map(lead => columns.map(col => escapeCSV(lead[col])).join(',')).join("\r\n")
  const csvContent = "\uFEFF" + header + rows

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `leads_espera_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const formatPhone = (phone?: string | null, remotejid?: string | null) => {
  const raw = phone || remotejid || ''
  const clean = raw.replace('@c.us', '').replace(/\D/g, '')
  if (clean.length === 13 && clean.startsWith('55')) {
    const ddd = clean.slice(2, 4)
    const part1 = clean.slice(4, 9)
    const part2 = clean.slice(9)
    return `+55 (${ddd}) ${part1}-${part2}`
  } else if (clean.length === 12 && clean.startsWith('55')) {
    const ddd = clean.slice(2, 4)
    const part1 = clean.slice(4, 8)
    const part2 = clean.slice(8)
    return `+55 (${ddd}) ${part1}-${part2}`
  } else if (clean.length === 11) {
    const ddd = clean.slice(0, 2)
    const part1 = clean.slice(2, 7)
    const part2 = clean.slice(7)
    return `(${ddd}) ${part1}-${part2}`
  }
  return raw.replace('@c.us', '') || 'Sem telefone'
}

const formatDate = (dateString?: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Realtime Subscription
let realtimeChannel: any

const setupRealtime = () => {
  realtimeChannel = supabase.channel('semcorretor_leads_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads' },
      (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (!payload.new.corretor_id) {
            if (!leads.value.find((l: any) => l.id === payload.new.id)) {
              leads.value.unshift(payload.new)
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          const idx = leads.value.findIndex((l: any) => l.id === payload.new.id)
          if (payload.new.corretor_id) {
            // Lead was assigned to a broker -> remove from "sem corretor" list
            if (idx !== -1) {
              leads.value.splice(idx, 1)
              leads.value = [...leads.value]
            }
          } else {
            // Lead is still without a broker -> update in list
            if (idx !== -1) {
              leads.value[idx] = { ...leads.value[idx], ...payload.new }
              leads.value = [...leads.value]
            } else {
              leads.value.unshift(payload.new)
              leads.value = [...leads.value]
            }
          }
        } else if (payload.eventType === 'DELETE') {
          leads.value = leads.value.filter((l: any) => l.id !== payload.old.id)
        }
      }
    )
    .subscribe()
}

onMounted(() => {
  fetchLeads()
  setupRealtime()
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white font-sans transition-colors duration-300">
    <Sidebar />

    <!-- Error Debug Output -->
    <pre v-if="error" class="fixed top-4 right-4 bg-red-50 text-red-600 dark:bg-red-900 dark:text-white p-4 rounded-xl z-50 max-w-md overflow-auto shadow-card">{{ error }}</pre>

    <main :class="[mainMargin, 'p-6 lg:p-10 h-screen overflow-hidden flex flex-col transition-all duration-300']">
      <!-- Header -->
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-primary-50 dark:bg-primary-500/10 rounded-xl text-primary-500 flex-shrink-0 shadow-sm">
            <Clock class="w-6 h-6" />
          </div>
          <div>
            <h1 class="text-xl lg:text-2xl font-bold tracking-tight flex items-center gap-3">
              Leads em Espera
              <span v-if="!loading" class="text-xs font-semibold text-primary-600 dark:text-primary-400 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20">
                {{ filteredLeads.length }} {{ filteredLeads.length === 1 ? 'interessado' : 'interessados' }}
              </span>
            </h1>
            <p class="text-gray-400 dark:text-dark-muted text-sm mt-0.5">
              Todos os leads de todos os estágios que aguardam atribuição de corretor.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button 
            @click="downloadCSV"
            :disabled="filteredLeads.length === 0"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download class="w-4 h-4 text-primary-500" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </header>

      <!-- Search and Stage Filters Bar -->
      <div class="flex flex-col gap-4 mb-6">
        <!-- Top row: Search input -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div class="relative flex-1">
            <Search class="w-4 h-4 text-gray-400 dark:text-dark-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              v-model="searchText"
              type="text"
              placeholder="Buscar por nome, telefone, e-mail, interesse ou código..."
              class="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
            />
            <button 
              v-if="searchText"
              @click="clearSearch"
              class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md"
              title="Limpar busca"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Stage Filter Chips -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span class="text-xs font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider mr-1 hidden sm:inline-flex items-center gap-1.5">
            <Filter class="w-3.5 h-3.5" /> Estágios:
          </span>

          <!-- Todos -->
          <button 
            @click="handleStageSelect('todos')"
            :class="[
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border',
              selectedStage === 'todos' 
                ? 'bg-primary-500 text-white border-primary-500 shadow-sm' 
                : 'bg-white dark:bg-dark-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5'
            ]"
          >
            <span>Todos</span>
            <span 
              :class="[
                'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                selectedStage === 'todos' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-dark-muted'
              ]"
            >
              {{ stageCounts['todos'] || 0 }}
            </span>
          </button>

          <!-- Stages from DB / Standard -->
          <button 
            v-for="s in stages"
            :key="s.id"
            @click="handleStageSelect(s.estagio)"
            :class="[
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border',
              selectedStage === s.estagio 
                ? 'bg-primary-500 text-white border-primary-500 shadow-sm' 
                : 'bg-white dark:bg-dark-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5'
            ]"
          >
            <span>{{ s.estagio_name || s.descricao || getStageName(s.estagio, s.id) }}</span>
            <span 
              :class="[
                'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                selectedStage === s.estagio ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-dark-muted'
              ]"
            >
              {{ stageCounts[s.estagio] || 0 }}
            </span>
          </button>
        </div>
      </div>

      <!-- Main Content Area: Table -->
      <div class="flex-1 overflow-hidden relative flex flex-col">
        <!-- Loading overlay -->
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center z-20 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm transition-colors duration-300">
          <div class="flex flex-col items-center gap-3">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <p class="text-xs text-gray-500 dark:text-dark-muted">Carregando leads em espera...</p>
          </div>
        </div>

        <!-- Table Card -->
        <div class="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border border-gray-100 dark:border-dark-border rounded-xl overflow-hidden flex-1 flex flex-col shadow-card transition-all duration-300">
          <div class="overflow-y-auto flex-1">
            <table class="w-full text-left border-collapse">
              <thead class="sticky top-0 z-10">
                <tr class="border-b border-gray-100 dark:border-dark-border text-gray-400 dark:text-dark-muted text-xs uppercase tracking-wider bg-gray-50/90 dark:bg-dark-card/90 backdrop-blur-md">
                  <th class="px-6 py-4 font-semibold">Nome</th>
                  <th class="px-6 py-4 font-semibold">Telefone</th>
                  <th class="px-6 py-4 font-semibold">Status (CRM)</th>
                  <th class="px-6 py-4 font-semibold">Cód. Imóvel</th>
                  <th class="px-6 py-4 font-semibold">Modo</th>
                  <th class="px-6 py-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50 dark:divide-dark-border text-sm">
                <!-- Empty State -->
                <tr v-if="!loading && filteredLeads.length === 0">
                  <td colspan="6" class="py-16 text-center">
                    <div class="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div class="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-dark-card flex items-center justify-center text-gray-400 dark:text-dark-muted mb-4 border border-gray-200 dark:border-dark-border">
                        <UserX class="w-7 h-7" />
                      </div>
                      <h3 class="text-base font-bold text-gray-900 dark:text-white">Nenhum lead encontrado</h3>
                      <p class="text-xs text-gray-400 dark:text-dark-muted mt-1">
                        {{ searchText ? 'Tente buscar com outros termos.' : 'Não há leads sem corretor atribuído neste momento.' }}
                      </p>
                      <button 
                        v-if="searchText || selectedStage !== 'todos'"
                        @click="() => { clearSearch(); selectedStage = 'todos'; }"
                        class="mt-4 px-4 py-2 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 rounded-lg hover:bg-primary-100 transition-colors"
                      >
                        Limpar Filtros
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Rows -->
                <tr 
                  v-for="lead in paginatedLeads" 
                  :key="lead.id" 
                  class="group hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <!-- Nome -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div v-if="lead.media_url" class="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden border border-gray-100 dark:border-dark-border">
                        <img :src="lead.media_url" :alt="lead.name || 'Avatar'" class="w-full h-full object-cover" />
                      </div>
                      <div v-else class="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-xs font-bold text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20 flex-shrink-0">
                        {{ (lead.name || 'D').charAt(0).toUpperCase() }}
                      </div>
                      <div class="min-w-0">
                        <span class="font-semibold text-gray-900 dark:text-white block truncate">{{ lead.name || 'Desconhecido' }}</span>
                        <span v-if="lead.created_at" class="text-[11px] text-gray-400 dark:text-dark-muted block">
                          Cadastrado em {{ formatDate(lead.created_at) }}
                        </span>
                      </div>
                    </div>
                  </td>

                  <!-- Telefone -->
                  <td class="px-6 py-4">
                    <span class="text-gray-500 dark:text-gray-300 text-xs font-mono font-medium">
                      {{ formatPhone(lead.phone, lead.remotejid) }}
                    </span>
                  </td>

                  <!-- Status -->
                  <td class="px-6 py-4">
                    <span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold', getStageBadgeClass(lead.stage || lead.situacao_nome, lead.stage_id)]">
                      {{ getStageName(lead.stage || lead.situacao_nome, lead.stage_id) }}
                    </span>
                  </td>

                  <!-- Código Imóvel -->
                  <td class="px-6 py-4 text-xs text-gray-500 dark:text-dark-muted font-mono">
                    <div class="flex items-center gap-1.5">
                      <Building v-if="lead.tipo_imovel || lead.metadata?.propertyCode" class="w-3.5 h-3.5 text-gray-400" />
                      <span>{{ lead.tipo_imovel || lead.metadata?.propertyCode || 'N/A' }}</span>
                    </div>
                  </td>

                  <!-- Modo -->
                  <td class="px-6 py-4 text-xs">
                    <span v-if="lead.agent_active === false" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                      <Lock class="w-3 h-3" /> Desativado
                    </span>
                    <span v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20">
                      <Bot class="w-3 h-3" /> Ativado
                    </span>
                  </td>

                  <!-- Ações -->
                  <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button 
                        @click="openChat(lead.id)"
                        class="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-all" 
                        title="Abrir Conversa"
                      >
                        <MessageCircle class="w-4 h-4" />
                      </button>
                      <button 
                        @click="openLeadDetails(lead)"
                        class="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-all" 
                        title="Ver Detalhes"
                      >
                        <Eye class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div v-if="filteredLeads.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-card/50 text-xs text-gray-500 dark:text-dark-muted">
            <div>
              Mostrando <span class="font-semibold text-gray-900 dark:text-white">{{ ((currentPage - 1) * itemsPerPage) + 1 }}</span> a <span class="font-semibold text-gray-900 dark:text-white">{{ Math.min(currentPage * itemsPerPage, filteredLeads.length) }}</span> de <span class="font-semibold text-gray-900 dark:text-white">{{ filteredLeads.length }}</span> leads sem corretor
            </div>

            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button 
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="p-1.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Página anterior"
              >
                <ChevronLeft class="w-4 h-4" />
              </button>

              <template v-for="(page, idx) in visiblePages" :key="idx">
                <span v-if="page === '...'" class="px-2 text-gray-400">...</span>
                <button 
                  v-else
                  @click="currentPage = Number(page)"
                  :class="[
                    'w-7 h-7 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center',
                    currentPage === page 
                      ? 'bg-primary-500 text-white shadow-sm' 
                      : 'border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                  ]"
                >
                  {{ page }}
                </button>
              </template>

              <button 
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="p-1.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Próxima página"
              >
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- Lead Details Modal -->
  <LeadDetailsModal
    :model-value="showModal"
    @update:model-value="showModal = $event"
    :lead="selectedLead"
    :stages="stages"
    @update-status="handleStatusUpdate"
    @save-notes="handleNotesUpdate"
  />
</template>
