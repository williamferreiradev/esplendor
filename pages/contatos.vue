<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'
import { User, Phone, Search, Filter, Calendar, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import LeadDetailsModal from '@/components/leads/LeadDetailsModal.vue'
import type { Cliente } from '@/types/crm'

const { mainMargin } = useSidebarState()
const supabase = useSupabaseClient<any>()

// State
const contacts = ref<any[]>([])
const stages = ref<any[]>([])
const loading = ref(true)
const searchQuery = ref('')
const showModal = ref(false)
const selectedContact = ref<Cliente | null>(null)

const showFilters = ref(false)
const filterStage = ref<string>('all')
const filterDateFrom = ref('')
const filterDateTo = ref('')

const currentPage = ref(1)
const itemsPerPage = 10

// Fetch contacts REAL Supabase
const fetchContacts = async () => {
  loading.value = true
  
  try {
    const { data: stagesData, error: stagesError } = await supabase.from('stage').select('*').order('id')
    if (stagesError) throw stagesError
    stages.value = stagesData || []

    const { data: leadsData, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (error) throw error
    contacts.value = leadsData || []
  } catch (error) {
    console.error('Error fetching contacts:', error)
  } finally {
    loading.value = false
  }
}

let realtimeChannel: any

const setupRealtime = () => {
  realtimeChannel = supabase.channel('contacts_leads_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          if (!contacts.value.find((l: any) => l.id === payload.new.id)) {
            contacts.value.unshift(payload.new)
          }
        } else if (payload.eventType === 'UPDATE') {
          const idx = contacts.value.findIndex((l: any) => l.id === payload.new.id)
          if (idx !== -1) {
            Object.assign(contacts.value[idx], payload.new)
          } else {
            contacts.value.push(payload.new)
          }
        } else if (payload.eventType === 'DELETE') {
          contacts.value = contacts.value.filter((l: any) => l.id !== payload.old.id)
        }
      }
    )
    .subscribe()
}

// Filtered contacts based on search + filters
const filteredContacts = computed(() => {
  let result = [...contacts.value]

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((contact: any) => 
      (contact.name?.toLowerCase().includes(query)) ||
      (contact.phone?.toLowerCase().includes(query))
    )
  }

  if (filterStage.value !== 'all') {
    result = result.filter((c: any) => c.stage === filterStage.value)
  }

  if (filterDateFrom.value) {
    const fromDate = new Date(`${filterDateFrom.value}T00:00:00`)
    result = result.filter((c: any) => {
      const cDate = new Date(c.created_at)
      return cDate >= fromDate
    })
  }

  if (filterDateTo.value) {
    const toDate = new Date(`${filterDateTo.value}T23:59:59`)
    result = result.filter((c: any) => {
      const cDate = new Date(c.created_at)
      return cDate <= toDate
    })
  }

  return result
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredContacts.value.length / itemsPerPage)))

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
})

const paginatedContacts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredContacts.value.slice(start, start + itemsPerPage)
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

watch([filterStage, filterDateFrom, filterDateTo, searchQuery], () => {
  currentPage.value = 1
})

const hasActiveFilters = computed(() => filterStage.value !== 'all' || filterDateFrom.value || filterDateTo.value)

const clearFilters = () => {
  filterStage.value = 'all'
  filterDateFrom.value = ''
  filterDateTo.value = ''
}

// CRM Stage Helpers
const getStageLabel = (stage: string, stageId?: number | null) => {
  const stageObj = stages.value.find((s: any) => s.estagio === stage || s.id === stageId)
  if (stageObj) {
    return stageObj.estagio_name || stageObj.descricao || stageObj.estagio
  }
  const fallbackOptions: Record<string, string> = {
    novo: 'Novo',
    em_atendimento: 'Em Atendimento',
    negociacao: 'Em Negociação',
    visita: 'Visita',
    agendado: 'Visita',
    fechado: 'Venda Fechada',
    convertido: 'Venda Fechada',
    perdido: 'Perdido'
  }
  return fallbackOptions[stage] || stage || 'Novo'
}

const getStageBadgeClass = (stage: string) => {
  const s = stage || 'novo'
  switch (s) {
    case 'novo':
      return 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 shadow-sm'
    case 'em_atendimento':
      return 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 shadow-sm'
    case 'negociacao':
      return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shadow-sm'
    case 'visita':
    case 'agendado':
      return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-sm'
    case 'fechado':
    case 'convertido':
      return 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20 shadow-sm'
    case 'perdido':
      return 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 shadow-sm'
    default:
      return 'bg-gray-100 dark:bg-dark-bg text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-dark-border shadow-sm'
  }
}

// Open modal
const openContactDetails = (contact: Cliente) => {
  selectedContact.value = contact
  showModal.value = true
}

// Handle status update from modal
const handleStatusUpdate = async (id: string, newStage: any) => {
  let stageObj = newStage
  if (typeof newStage === 'string') {
    stageObj = stages.value.find((s: any) => s.estagio === newStage)
  }
  
  if (!stageObj) {
    console.error('Stage not found for status update:', newStage)
    return
  }

  const contact = contacts.value.find(c => c.id === id)
  const isQual = ['qualificado', 'convertido', 'agendado', 'negociacao', 'visita', 'fechado'].includes(stageObj.estagio)
  if (contact) {
    contact.stage = stageObj.estagio
    contact.stage_id = stageObj.id
    contact.is_qualified = isQual
  }
  try {
    const { error: updateError } = await supabase.from('leads').update({
      stage_id: stageObj.id,
      stage: stageObj.estagio
    }).eq('id', id)
    
    if (updateError) {
      console.error('Error updating status in DB:', updateError)
    }
  } catch (err) {
    console.error('Error updating status:', err)
  }
}

// Handle notes update from modal
const handleNotesUpdate = async (id: string, notes: string) => {
  const contact = contacts.value.find(c => c.id === id)
  if (contact) {
    contact.about = notes
  }
  try {
    await supabase.from('leads').update({ about: notes }).eq('id', id)
  } catch (err) {
    console.error('Error updating notes:', err)
  }
}

onMounted(() => {
  fetchContacts()
  setupRealtime()
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white font-sans selection:bg-primary-500 selection:text-white transition-colors duration-300">
    <Sidebar />

    <main :class="[mainMargin, 'px-4 py-5 sm:px-6 lg:p-10 transition-all duration-300']">
      <!-- Header -->
      <header class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Contatos</h1>
        <p class="text-gray-400 dark:text-dark-muted text-sm mt-1">Lista de todos os contatos com filtros</p>
      </header>

      <!-- Main Card -->
      <div class="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden shadow-sm transition-colors">
        
        <!-- Card Header with Icon and Count -->
        <div class="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-dark-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-xl">
              <User class="w-5 h-5 text-primary-600 dark:text-primary-500" />
            </div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">Diretório de Interessados</h2>
          </div>
          <div class="flex items-center gap-2">


            <!-- Filter toggle -->
            <button 
              @click="showFilters = !showFilters"
              :class="['flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border', showFilters || hasActiveFilters ? 'text-primary-600 bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/20' : 'text-gray-500 dark:text-dark-muted hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-dark-card border-gray-100 dark:border-dark-border']"
            >
              <Filter class="w-3.5 h-3.5" />
              <span v-if="!showFilters">Filtrar</span>
            </button>

            <span class="bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 shadow-inner">
              {{ filteredContacts.length }} de {{ contacts.length }}
            </span>
          </div>
        </div>

        <!-- Filters Panel -->
        <Transition name="slide">
          <div v-if="showFilters" class="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gray-50/80 dark:bg-dark-card/30">
            <div class="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-4 lg:gap-6">
              <!-- Status Filter -->
              <div class="flex items-center gap-3 overflow-x-auto max-w-full pb-2 md:pb-0">
                <span class="text-[11px] font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider flex-shrink-0">Status</span>
                <div class="flex gap-1.5 bg-white dark:bg-dark-surface p-1 rounded-xl border border-gray-100 dark:border-dark-border min-w-max">
                  <button 
                    v-for="opt in [
                      { value: 'all', label: 'Todos' }, 
                      { value: 'novo', label: 'Novo' }, 
                      { value: 'em_atendimento', label: 'Em Atendimento' },
                      { value: 'negociacao', label: 'Negociação' },
                      { value: 'visita', label: 'Visita' },
                      { value: 'fechado', label: 'Fechado' },
                      { value: 'perdido', label: 'Perdido' }
                    ]"
                    :key="opt.value"
                    @click="filterStage = opt.value"
                    :class="['px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap', filterStage === opt.value ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card']"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <!-- Date Filter -->
              <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span class="text-[11px] font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider">Período</span>
                <div class="grid grid-cols-1 min-[420px]:grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input v-model="filterDateFrom" type="date" class="bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-400" />
                  <span class="text-[10px] text-gray-400">até</span>
                  <input v-model="filterDateTo" type="date" class="bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-400" />
                </div>
              </div>

              <!-- Clear -->
              <button v-if="hasActiveFilters" @click="clearFilters" class="text-xs text-red-500 hover:text-red-600 font-medium">Limpar</button>
            </div>
          </div>
        </Transition>

        <!-- Search Bar -->
        <div class="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
          <div class="relative max-w-2xl">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar interessado por nome ou telefone..."
              class="w-full bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl pl-12 pr-4 py-3 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-sm transition-all"
            />
          </div>
        </div>

        <!-- Table Header -->
        <div class="hidden sm:grid px-6 py-3 bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border grid-cols-12 gap-4 text-xs font-bold text-gray-500 dark:text-dark-muted uppercase tracking-wider">
          <div class="col-span-8">Nome</div>
          <div class="col-span-4 text-right">Avaliação</div>
        </div>

        <!-- Contact List -->
        <div class="divide-y divide-gray-200 dark:divide-dark-border">
          <!-- Loading State -->
          <div v-if="loading" class="p-12 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>

          <!-- Empty State -->
          <div v-else-if="filteredContacts.length === 0" class="p-12 text-center">
            <p class="text-gray-500 dark:text-dark-muted">Nenhum interessado encontrado</p>
          </div>

          <!-- Contact Rows -->
          <div
            v-else
            v-for="contact in paginatedContacts"
            :key="contact.id"
            @click="openContactDetails(contact)"
            class="px-4 sm:px-6 py-4 bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-all group flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 sm:items-center"
          >
            <!-- Left: Avatar + Name + Phone -->
            <div class="w-full sm:col-span-8 flex items-center gap-4">
              <!-- Avatar -->
              <div v-if="(contact as any).media_url" class="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden border border-gray-200 dark:border-dark-border shadow-sm">
                <img :src="(contact as any).media_url" :alt="contact.name || 'Avatar'" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-500 flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm">
                {{ (contact.name || 'I').charAt(0).toUpperCase() }}
              </div>

              <!-- Info -->
              <div class="min-w-0 flex-1">
                <h3 class="font-bold text-gray-900 dark:text-white text-base truncate group-hover:text-primary-500 transition-colors">
                  {{ contact.name || 'Desconhecido' }}
                </h3>
                <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-muted mt-0.5">
                  <Phone class="w-3 h-3" />
                  <span>{{ contact.phone || '' }}</span>
                </div>
              </div>
            </div>

            <div class="w-full sm:col-span-4 flex flex-wrap items-center justify-start sm:justify-end gap-2 pl-14 sm:pl-0">
              <span
                :class="['inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border shadow-sm', getStageBadgeClass(contact.stage)]"
              >
                {{ getStageLabel(contact.stage, contact.stage_id) }}
              </span>

              <!-- Travado Badge -->
              <span
                v-if="contact.agent_active === false"
                class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-500/20"
              >
                 Travado
              </span>
            </div>
          </div>
        </div>

        <!-- Footer / Pagination -->
        <div class="px-6 py-4 border-t border-gray-200 dark:border-dark-border flex justify-between items-center bg-white dark:bg-dark-surface">
          <p class="text-xs text-gray-400 dark:text-dark-muted">
            Mostrando <span class="text-gray-700 dark:text-white font-medium">{{ filteredContacts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0 }}-{{ Math.min(currentPage * itemsPerPage, filteredContacts.length) }}</span> 
            de {{ filteredContacts.length }} interessados
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
    </main>
  </div>

  <!-- Lead Details Modal -->
  <LeadDetailsModal
    :model-value="showModal"
    @update:model-value="showModal = $event"
    :lead="selectedContact"
    :stages="stages"
    @update-status="handleStatusUpdate"
    @save-notes="handleNotesUpdate"
  />
</template>

<style scoped>
.slide-enter-active, .slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from, .slide-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}
.slide-enter-to, .slide-leave-from {
  max-height: 200px;
}
</style>
