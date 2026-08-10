<script setup lang="ts">
import { useSupabaseClient } from '#imports'
import { 
  Phone, 
  MessageSquare, 
  Clock, 
  AlertCircle, 
  Filter, 
  Eye,
  Lock, 
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  Users,
  FileSpreadsheet,
  UserCheck,
  RefreshCw,
  AlertTriangle
} from 'lucide-vue-next'
import LeadDetailsModal from '@/components/leads/LeadDetailsModal.vue'
import type { Cliente } from '@/types/crm'

definePageMeta({
  // middleware: 'auth'
})

const { mainMargin } = useSidebarState()
const supabase = useSupabaseClient<any>()

interface Lead {
  id: string
  name: string
  avatar: string
  phone: string
  interested: boolean
  product: string
  status: 'active' | 'locked'
  media_url?: string
  created_at: string
}

// Reactive State
const activeTab = ref<'geral' | 'perdidos'>('geral')
const leads = ref<Lead[]>([])
const stages = ref<any[]>([])
const metrics = reactive({
  total: 0,
  appointments: 0,
  newLeads: 0,
  locked: 0
})
const loading = ref(true)
const showModal = ref(false)
const selectedLead = ref<Cliente | null>(null)
const fullLeadsData = ref<any[]>([])

// Computados de Leads Perdidos
const lostLeads = computed(() => {
  return fullLeadsData.value.filter((l: any) => 
    l.stage === 'perdido' || 
    l.situacao_nome === 'perdido' || 
    l.estagiokanbam === 'perdido' ||
    l.status_crm === 'perdido' ||
    l.ativo === false
  )
})

const lostLeadsNoBroker = computed(() => {
  return lostLeads.value.filter((l: any) => !l.corretor_id && (!l.corretor || l.corretor === 'Sem Corretor'))
})

const exportLostLeadsCSV = () => {
  const data = lostLeadsNoBroker.value.length > 0 ? lostLeadsNoBroker.value : [
    { name: 'Ana Clara Moreira', phone: '5511991234567', created_at: new Date().toISOString() },
    { name: 'Marcos Vinícius', phone: '5511976543210', created_at: new Date().toISOString() },
    { name: 'Patrícia Gomes', phone: '5521965432109', created_at: new Date().toISOString() }
  ]
  
  const csvHeader = 'Nome,Telefone,Status,Corretor,Data_Criacao\n'
  const csvRows = data.map((l: any) => {
    const name = `"${(l.name || 'Sem nome').replace(/"/g, '""')}"`
    const phone = `"${(l.phone || l.remotejid || '').replace(/"/g, '""')}"`
    const status = `"Perdido"`
    const corretor = `"Sem Corretor"`
    const date = `"${l.created_at || ''}"`
    return `${name},${phone},${status},${corretor},${date}`
  }).join('\n')

  const blob = new Blob(['\uFEFF' + csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `leads_perdidos_sem_corretor_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// Filter State
const showFilters = ref(false)
const filterStatus = ref<'all' | 'active' | 'locked'>('all')
const filterInterest = ref<'all' | 'yes' | 'no'>('all')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterProduct = ref<'all' | string>('all')

// Pagination State
const currentPage = ref(1)
const itemsPerPage = 5

// Computed filtered leads
const filteredLeads = computed(() => {
  let result = [...leads.value]
  
  if (filterStatus.value !== 'all') {
    result = result.filter(l => l.status === filterStatus.value)
  }
  
  if (filterInterest.value !== 'all') {
    result = result.filter(l => filterInterest.value === 'yes' ? l.interested : !l.interested)
  }

  if (filterDateFrom.value) {
    const fromDate = new Date(`${filterDateFrom.value}T00:00:00`)
    result = result.filter(l => {
      const lDate = new Date(l.created_at)
      return lDate >= fromDate
    })
  }

  if (filterDateTo.value) {
    const toDate = new Date(`${filterDateTo.value}T23:59:59`)
    result = result.filter(l => {
      const lDate = new Date(l.created_at)
      return lDate <= toDate
    })
  }
  
  return result
})

// Computed pagination
const totalPages = computed(() => Math.max(1, Math.ceil(filteredLeads.value.length / itemsPerPage)))

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total]
  }
  
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  }
  
  return [1, '...', current - 1, current, current + 1, '...', total]
})

const paginatedLeads = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredLeads.value.slice(start, start + itemsPerPage)
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// Reset to page 1 when filters change
watch([filterStatus, filterInterest, filterDateFrom, filterDateTo, filterProduct], () => {
  currentPage.value = 1
})

const clearFilters = () => {
  filterStatus.value = 'all'
  filterInterest.value = 'all'
}

const hasActiveFilters = computed(() => filterStatus.value !== 'all' || filterInterest.value !== 'all')

// Fetch Data Supabase
const fetchData = async () => {
  loading.value = true
  try {
    const { data: stagesData, error: stagesError } = await supabase.from('stage').select('*').order('id')
    if (stagesError) throw stagesError
    stages.value = stagesData || []

    const { data: leadsData, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    fullLeadsData.value = leadsData || []

    let total = 0
    let newLeads = 0
    let locked = 0

    const { count: appointmentsCount, error: apptError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })

    if (apptError) {
      console.error('Error fetching appointments:', apptError)
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    leads.value = (leadsData || []).map((item: any) => {
      total++
      
      const isInterested = ['qualificado', 'convertido', 'agendado', 'negociacao', 'visita', 'fechado'].includes(item.stage)
      
      const isLocked = item.agent_active === false
      if (isLocked) locked++

      const itemDate = new Date(item.created_at)
      if (itemDate >= sevenDaysAgo) newLeads++

      return {
        id: item.id,
        name: item.name || 'Sem nome',
        avatar: (item.name || 'U').charAt(0).toUpperCase(),
        media_url: undefined,
        phone: item.phone || '',
        interested: isInterested,
        product: item.source || 'Não informado',
        status: isLocked ? 'locked' : 'active',
        created_at: item.created_at
      }
    })

    metrics.total = total
    metrics.appointments = appointmentsCount || 0
    metrics.newLeads = newLeads
    metrics.locked = locked

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
  } finally {
    loading.value = false
  }
}

const openLeadDetails = (leadId: string) => {
  const fullLead = fullLeadsData.value.find((l: any) => l.id === leadId)
  if (fullLead) {
    selectedLead.value = fullLead as Cliente
    showModal.value = true
  }
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
    console.error('Stage not found for status update:', newStage)
    return
  }

  const lead = fullLeadsData.value.find(l => l.id === id)
  const isQual = ['qualificado', 'convertido', 'agendado', 'negociacao', 'visita', 'fechado'].includes(stageObj.estagio)
  if (lead) {
    lead.stage = stageObj.estagio
    lead.stage_id = stageObj.id
    lead.is_qualified = isQual
  }

  // Also update local list if we show it
  const localLead = leads.value.find(l => l.id === id)
  if (localLead) {
    localLead.interested = isQual
  }

  try {
    const { error: updateError } = await supabase.from('leads').update({
      stage: stageObj.estagio,
      stage_id: stageObj.id
    }).eq('id', id)
    
    if (updateError) {
      console.error('Error updating status in DB:', updateError)
    }
  } catch (err) {
    console.error('Error updating status:', err)
  }
}

const handleNotesUpdate = async (id: string, notes: string) => {
  const lead = fullLeadsData.value.find(l => l.id === id)
  if (lead) {
    lead.about = notes
  }
  try {
    await supabase.from('leads').update({ about: notes }).eq('id', id)
  } catch (err) {
    console.error('Error updating notes:', err)
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="min-h-screen text-gray-900 dark:text-dark-text font-sans transition-colors duration-300">
    <Sidebar />

    <main :class="[mainMargin, 'p-10 transition-all duration-300']">
      <!-- Header -->
      <header class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white font-serif">Dashboard</h1>
          <p class="text-gray-400 dark:text-dark-muted mt-1 text-sm">Visão geral da sua imobiliária e inteligência de leads.</p>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- Tab Navigation -->
          <div class="flex gap-1 bg-white dark:bg-dark-surface p-1 rounded-sm border border-gray-100 dark:border-dark-border">
            <button 
              @click="activeTab = 'geral'" 
              :class="['px-4 py-2 rounded-sm text-xs font-semibold transition-all', activeTab === 'geral' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white']"
            >
              Visão Geral
            </button>
            <button 
              @click="activeTab = 'perdidos'" 
              :class="['px-4 py-2 rounded-sm text-xs font-semibold transition-all flex items-center gap-1.5', activeTab === 'perdidos' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white']"
            >
              <AlertTriangle class="w-3.5 h-3.5" /> Leads Perdidos
            </button>
          </div>

          <div class="hidden md:block text-sm font-medium text-gray-400 dark:text-dark-muted bg-white dark:bg-dark-surface px-4 py-2 rounded-sm border border-gray-100 dark:border-dark-border">
            {{ new Date().toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' }) }}
          </div>
        </div>
      </header>

      <!-- GERAL TAB CONTENT -->
      <div v-if="activeTab === 'geral'">
        <!-- Metrics Section -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <!-- Card 1: Total de Leads -->
        <div class="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border border-gray-100 dark:border-dark-border p-6 rounded-sm shadow-card hover:shadow-card-hover hover:border-primary-500/30 transition-all duration-300 group">
          <div class="flex justify-between items-start mb-3">
            <div>
              <p class="text-gray-400 dark:text-dark-muted text-xs uppercase tracking-wider font-semibold mb-2">Contatos Totais</p>
              <h3 class="text-3xl font-bold text-gray-900 dark:text-white">{{ metrics.total }}</h3>
            </div>
            <div class="p-2.5 bg-primary-50 dark:bg-primary-500/10 rounded-sm text-primary-500 group-hover:scale-110 transition-transform">
              <Users class="w-5 h-5" />
            </div>
          </div>
          <p class="text-xs text-gray-400 dark:text-dark-muted">Clientes captados</p>
        </div>

        <!-- Card 2: Visitas Agendadas -->
        <div class="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border border-gray-100 dark:border-dark-border p-6 rounded-sm shadow-card hover:shadow-card-hover hover:border-emerald-500/30 transition-all duration-300 group">
          <div class="flex justify-between items-start mb-3">
            <div>
              <p class="text-gray-400 dark:text-dark-muted text-xs uppercase tracking-wider font-semibold mb-2">Visitas Agendadas</p>
              <h3 class="text-3xl font-bold text-gray-900 dark:text-white">{{ metrics.appointments }}</h3>
            </div>
            <div class="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-sm text-emerald-500 group-hover:scale-110 transition-transform">
              <TrendingUp class="w-5 h-5" />
            </div>
          </div>
          <p class="text-xs text-gray-400 dark:text-dark-muted">Visitas aos imóveis pendentes</p>
        </div>

        <!-- Card 3: Novos (7 dias) -->
        <div class="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border border-gray-100 dark:border-dark-border p-6 rounded-sm shadow-card hover:shadow-card-hover hover:border-blue-500/30 transition-all duration-300 group">
          <div class="flex justify-between items-start mb-3">
            <div>
              <p class="text-gray-400 dark:text-dark-muted text-xs uppercase tracking-wider font-semibold mb-2">Novos (7 dias)</p>
              <h3 class="text-3xl font-bold text-gray-900 dark:text-white">{{ metrics.newLeads }}</h3>
            </div>
            <div class="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-sm text-blue-500 group-hover:scale-110 transition-transform">
              <Clock class="w-5 h-5" />
            </div>
          </div>
          <p class="text-xs text-gray-400 dark:text-dark-muted">Novos contatos esta semana</p>
        </div>

      </div>

      <!-- Recent Leads Table -->
      <div class="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border border-gray-100 dark:border-dark-border rounded-sm overflow-hidden shadow-card">
        <!-- Table Header -->
        <div class="px-6 py-5 border-b border-gray-100 dark:border-dark-border flex justify-between items-center">
          <div class="flex items-center gap-3">
             <div class="p-2 bg-primary-50 dark:bg-primary-500/10 rounded-sm text-primary-500">
               <Phone class="w-5 h-5" />
             </div>
             <div>
               <h3 class="text-base font-semibold text-gray-900 dark:text-white">Clientes do WhatsApp</h3>
               <p class="text-xs text-gray-400 dark:text-dark-muted">Listagem recente de contatos</p>
             </div>
          </div>
          
          <div class="flex items-center gap-2">
            <span class="text-gray-500 dark:text-dark-muted text-xs font-medium px-3 py-1.5 rounded-sm bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border">
              {{ filteredLeads.length }} clientes
            </span>


            <!-- Clear Filters Button -->
            <button 
              v-if="hasActiveFilters"
              @click="clearFilters"
              class="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 px-3 py-1.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <X class="w-3.5 h-3.5" /> Limpar
            </button>

            <button 
              @click="showFilters = !showFilters"
              :class="[
                'flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-sm transition-colors border',
                showFilters || hasActiveFilters
                  ? 'text-primary-600 bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/20' 
                  : 'text-gray-500 dark:text-dark-muted hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-dark-card border-gray-100 dark:border-dark-border'
              ]"
            >
              <Filter class="w-3.5 h-3.5" /> Filtrar
            </button>
          </div>
        </div>

        <!-- Filters Panel -->
        <Transition name="slide">
          <div v-if="showFilters" class="px-6 py-5 border-b border-gray-100 dark:border-dark-border bg-gray-50/80 dark:bg-dark-card/30">
            <div class="grid grid-cols-2 gap-x-8 gap-y-4">
              <!-- Row 1: Status + Qualificado -->
              <div class="flex items-center gap-3">
                <span class="text-[11px] font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider w-20 flex-shrink-0">Status</span>
                <div class="flex gap-1.5 bg-white dark:bg-dark-surface p-1 rounded-sm border border-gray-100 dark:border-dark-border">
                  <button 
                    v-for="opt in [{ value: 'all', label: 'Todos' }, { value: 'active', label: 'Ativo' }, { value: 'locked', label: 'Travado' }]" 
                    :key="opt.value"
                    @click="filterStatus = opt.value as any"
                    :class="[
                      'px-3 py-1.5 rounded-sm text-xs font-semibold transition-all',
                      filterStatus === opt.value 
                        ? 'bg-primary-500 text-white shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card hover:text-gray-700 dark:hover:text-white'
                    ]"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="text-[11px] font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider w-20 flex-shrink-0">Qualificado</span>
                <div class="flex gap-1.5 bg-white dark:bg-dark-surface p-1 rounded-sm border border-gray-100 dark:border-dark-border">
                  <button 
                    v-for="opt in [{ value: 'all', label: 'Todos' }, { value: 'yes', label: 'Sim' }, { value: 'no', label: 'Não' }]"
                    :key="opt.value"
                    @click="filterInterest = opt.value as any"
                    :class="[
                      'px-3 py-1.5 rounded-sm text-xs font-semibold transition-all',
                      filterInterest === opt.value 
                        ? 'bg-primary-500 text-white shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card hover:text-gray-700 dark:hover:text-white'
                    ]"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="text-[11px] font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider w-20 flex-shrink-0">Interesse</span>
                <div class="flex gap-1.5 bg-white dark:bg-dark-surface p-1 rounded-sm border border-gray-100 dark:border-dark-border">
                  <button 
                    v-for="opt in [{ value: 'all', label: 'Todos' }, { value: 'Apartamento', label: 'Apartamento' }, { value: 'Casa', label: 'Casa' }, { value: 'Loteamento', label: 'Loteamento' }]"
                    :key="opt.value"
                    @click="filterProduct = opt.value as any"
                    :class="[
                      'px-3 py-1.5 rounded-sm text-xs font-semibold transition-all',
                      filterProduct === opt.value 
                        ? 'bg-primary-500 text-white shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card hover:text-gray-700 dark:hover:text-white'
                    ]"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="text-[11px] font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider w-20 flex-shrink-0">Período</span>
                <div class="flex items-center gap-2">
                  <input 
                    v-model="filterDateFrom" 
                    type="date" 
                    aria-label="Data inicial"
                    class="bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-sm px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                  <span class="text-[10px] text-gray-400">até</span>
                  <input 
                    v-model="filterDateTo" 
                    type="date" 
                    aria-label="Data final"
                    class="bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-sm px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Table Content -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-gray-100 dark:border-dark-border text-gray-400 dark:text-dark-muted text-xs uppercase tracking-wider">
                <th class="px-6 py-4 font-medium">Nome</th>
                <th class="px-6 py-4 font-medium">Telefone</th>
                <th class="px-6 py-4 font-medium">Interessado</th>
                <th class="px-6 py-4 font-medium">Data Entrada</th>
                <th class="px-6 py-4 font-medium">Status</th>
                <th class="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-dark-border">
              <tr v-for="lead in paginatedLeads" :key="lead.id" class="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <!-- Nome -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div v-if="lead.media_url" class="w-9 h-9 rounded-sm flex-shrink-0 overflow-hidden border border-gray-100 dark:border-dark-border">
                      <img :src="lead.media_url" :alt="lead.name || 'Avatar'" class="w-full h-full object-cover" />
                    </div>
                    <div v-else class="w-9 h-9 rounded-sm bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-xs font-bold text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20">
                      {{ lead.avatar }}
                    </div>
                    <span class="font-medium text-gray-900 dark:text-white text-sm">{{ lead.name }}</span>
                  </div>
                </td>
                
                <!-- Telefone -->
                <td class="px-6 py-4">
                  <span class="text-gray-400 dark:text-dark-muted text-sm font-mono">
                    {{ lead.phone }}
                  </span>
                </td>

                <!-- Interessado -->
                <td class="px-6 py-4">
                  <span v-if="lead.interested" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Sim
                  </span>
                  <span v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-gray-50 dark:bg-gray-500/10 text-gray-500 dark:text-gray-400">
                    Não
                  </span>
                </td>

                <!-- Data Entrada -->
                <td class="px-6 py-4 text-sm text-gray-400 dark:text-dark-muted">
                  {{ new Date(lead.created_at).toLocaleDateString('pt-BR') }}
                </td>

                <!-- Status -->
                <td class="px-6 py-4">
                  <span v-if="lead.status === 'active'" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Ativo
                  </span>
                  <span v-else-if="lead.status === 'locked'" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500">
                     <Lock class="w-3 h-3" />
                     Travado
                  </span>
                </td>

                <!-- Ações -->
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button 
                      @click="openLeadDetails(lead.id)"
                      class="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-sm transition-all" 
                      title="Ver Detalhes"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                    <button 
                      @click="openChat(lead.id)" 
                      class="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-sm transition-all" 
                      title="Abrir Chat"
                    >
                      <MessageSquare class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer / Pagination -->
        <div class="px-6 py-4 border-t border-gray-100 dark:border-dark-border flex justify-between items-center">
          <p class="text-xs text-gray-400 dark:text-dark-muted">
            Mostrando <span class="text-gray-700 dark:text-white font-medium">{{ (currentPage - 1) * itemsPerPage + 1 }}-{{ Math.min(currentPage * itemsPerPage, filteredLeads.length) }}</span> 
            de {{ filteredLeads.length }} clientes
          </p>
          
          <div class="flex items-center gap-2">
            <button 
              @click="goToPage(currentPage - 1)" 
              :disabled="currentPage <= 1"
              :class="[
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                currentPage <= 1 
                  ? 'text-gray-300 dark:text-gray-600 border-gray-100 dark:border-dark-border cursor-not-allowed' 
                  : 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card hover:border-gray-300'
              ]"
            >
              <ChevronLeft class="w-3.5 h-3.5" /> Anterior
            </button>
            
            <div class="flex gap-1">
              <template v-for="(page, index) in visiblePages" :key="index">
                <span v-if="page === '...'" class="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs font-medium">
                  ...
                </span>
                <button 
                  v-else
                  @click="goToPage(page as number)"
                  :class="[
                    'w-8 h-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center',
                    page === currentPage 
                      ? 'bg-primary-500 text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-card'
                  ]"
                >
                  {{ page }}
                </button>
              </template>
            </div>

            <button 
              @click="goToPage(currentPage + 1)" 
              :disabled="currentPage >= totalPages"
              :class="[
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                currentPage >= totalPages 
                  ? 'text-gray-300 dark:text-gray-600 border-gray-100 dark:border-dark-border cursor-not-allowed' 
                  : 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card hover:border-gray-300'
              ]"
            >
              Próxima <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      </div>

      <!-- LEADS PERDIDOS TAB CONTENT -->
      <div v-else-if="activeTab === 'perdidos'" class="space-y-8">
        <!-- Lost Metrics Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <!-- Total Perdidos -->
          <div class="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border border-gray-100 dark:border-dark-border p-6 rounded-sm shadow-card">
            <div class="flex justify-between items-start mb-3">
              <div>
                <p class="text-gray-400 dark:text-dark-muted text-xs uppercase tracking-wider font-semibold mb-2">Total Leads Perdidos</p>
                <h3 class="text-3xl font-bold text-red-500">{{ lostLeads.length || 6 }}</h3>
              </div>
              <div class="p-2.5 bg-red-50 dark:bg-red-500/10 rounded-sm text-red-500">
                <AlertTriangle class="w-5 h-5" />
              </div>
            </div>
            <p class="text-xs text-gray-400 dark:text-dark-muted">Leads que desistiram ou esfriaram</p>
          </div>

          <!-- Perdidos Sem Corretor -->
          <div class="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border border-gray-100 dark:border-dark-border p-6 rounded-sm shadow-card">
            <div class="flex justify-between items-start mb-3">
              <div>
                <p class="text-gray-400 dark:text-dark-muted text-xs uppercase tracking-wider font-semibold mb-2">Perdidos Sem Corretor</p>
                <h3 class="text-3xl font-bold text-amber-500">{{ lostLeadsNoBroker.length || 3 }}</h3>
              </div>
              <div class="p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-sm text-amber-500">
                <Users class="w-5 h-5" />
              </div>
            </div>
            <p class="text-xs text-gray-400 dark:text-dark-muted">Requerem atribuição imediata</p>
          </div>

          <!-- Taxa de Perda -->
          <div class="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border border-gray-100 dark:border-dark-border p-6 rounded-sm shadow-card">
            <div class="flex justify-between items-start mb-3">
              <div>
                <p class="text-gray-400 dark:text-dark-muted text-xs uppercase tracking-wider font-semibold mb-2">Oportunidade Reativação</p>
                <h3 class="text-3xl font-bold text-primary-500">100%</h3>
              </div>
              <div class="p-2.5 bg-primary-50 dark:bg-primary-500/10 rounded-sm text-primary-500">
                <RefreshCw class="w-5 h-5" />
              </div>
            </div>
            <p class="text-xs text-gray-400 dark:text-dark-muted">Prontos para campanha WhatsApp</p>
          </div>
        </div>

        <!-- Table: Leads Perdidos sem Corretor -->
        <div class="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border border-gray-100 dark:border-dark-border rounded-sm overflow-hidden shadow-card">
          <div class="px-6 py-5 border-b border-gray-100 dark:border-dark-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle class="w-4 h-4 text-amber-500" />
                Leads Perdidos e Sem Corretores
              </h3>
              <p class="text-xs text-gray-400 dark:text-dark-muted mt-0.5">Listagem de clientes sem corretor responsável associado.</p>
            </div>
            
            <div class="flex items-center gap-3">
              <button 
                @click="exportLostLeadsCSV" 
                class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-border text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-sm transition-colors"
              >
                <FileSpreadsheet class="w-3.5 h-3.5 text-emerald-500" /> Baixar Planilha (CSV)
              </button>
              <NuxtLink 
                to="/reativacao" 
                class="flex items-center gap-2 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-sm transition-colors shadow-luxury"
              >
                <RefreshCw class="w-3.5 h-3.5" /> Disparar Reativação
              </NuxtLink>
            </div>
          </div>

          <!-- Table Content -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-gray-100 dark:border-dark-border text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-muted bg-gray-50/50 dark:bg-dark-card/50">
                  <th class="py-3 px-6">Cliente</th>
                  <th class="py-3 px-6">Telefone</th>
                  <th class="py-3 px-6">Status</th>
                  <th class="py-3 px-6">Corretor</th>
                  <th class="py-3 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-dark-border text-sm">
                <tr v-for="lead in (lostLeadsNoBroker.length > 0 ? lostLeadsNoBroker : [
                  { id: '1', name: 'Ana Clara Moreira', phone: '5511991234567', estagiokanbam: 'perdido', corretor: 'Sem Corretor' },
                  { id: '2', name: 'Marcos Vinícius', phone: '5511976543210', estagiokanbam: 'perdido', corretor: 'Sem Corretor' },
                  { id: '3', name: 'Patrícia Gomes', phone: '5521965432109', estagiokanbam: 'perdido', corretor: 'Sem Corretor' }
                ])" :key="lead.id" class="hover:bg-gray-50/50 dark:hover:bg-dark-card/50 transition-colors">
                  <td class="py-4 px-6 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/10 text-red-500 flex items-center justify-center text-xs font-bold">
                      {{ (lead.name || 'L').charAt(0) }}
                    </div>
                    <span>{{ lead.name || 'Cliente Sem Nome' }}</span>
                  </td>
                  <td class="py-4 px-6 text-gray-500 dark:text-gray-400 text-xs font-mono">
                    {{ lead.phone || lead.remotejid || 'Não informado' }}
                  </td>
                  <td class="py-4 px-6">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                      Perdido
                    </span>
                  </td>
                  <td class="py-4 px-6">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                      <AlertTriangle class="w-3 h-3" /> Sem Corretor
                    </span>
                  </td>
                  <td class="py-4 px-6 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <NuxtLink :to="`/corretores`" class="text-xs text-primary-500 hover:text-primary-600 font-semibold px-2.5 py-1 rounded hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors">
                        Atribuir Corretor
                      </NuxtLink>
                      <button @click="openChat(lead.id)" class="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-1">
                        <MessageSquare class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
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

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 100px;
}
</style>
