<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { MessageSquare, KanbanSquare, Table as TableIcon, Download } from 'lucide-vue-next'
import KanbanBoard from '@/components/crm/KanbanBoard.vue'
import LeadTable from '@/components/crm/LeadTable.vue'
import LeadDetailsModal from '@/components/leads/LeadDetailsModal.vue'
import type { Cliente, CrmStatus } from '@/types/crm'
import { useSupabaseClient } from '#imports'

const { mainMargin } = useSidebarState()
const supabase = useSupabaseClient<any>()

// State
const currentView = ref<'kanban' | 'table'>('kanban')
const leads = ref<any[]>([])
const stages = ref<any[]>([])
const loading = ref(true)
const error = ref<any>(null)
const showModal = ref(false)
const selectedLead = ref<Cliente | null>(null)

// Export Logic
const downloadCSV = () => {
  const columns = [
    'id', 'name', 'phone', 'stage', 'agent_active', 'created_at', 'source', 'expected_value', 'about', 'ativo', 'stage_id', 'ultima_mensagem_at', 'corretor_id', 'tipo_imovel', 'localizacao', 'situacao_nome', 'profissao', 'tempo_trabalho', 'renda_mensal', 'tipo_renda', 'doc_cpf', 'doc_rg', 'doc_certidao', 'doc_residencia', 'doc_carteira_trabalho', 'doc_contracheque', 'doc_movimentacao', 'url_cpf', 'url_rg', 'url_certidao', 'url_residencia', 'url_contracheque', 'dataHandoff', 'estado_civil', 'endereco_atual', 'url_carteira_trabalho', 'url_movimentacao', 'last_followup_status', 'last_mensagem_followup_at'
  ];

  const escapeCSV = (value: any) => {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value);
    return '"' + stringValue.replace(/"/g, '""') + '"';
  };

  const header = columns.join(',') + "\r\n";
  const rows = leads.value.map(lead => columns.map(col => escapeCSV(lead[col])).join(',')).join("\r\n");
  const csvContent = "\uFEFF" + header + rows;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Fetch Data - REAL SUPABASE
const fetchLeads = async () => {
  loading.value = true
  error.value = null
  
  try {
    const { data: stagesData, error: stagesError } = await supabase.from('stage').select('*').order('id')
    if (stagesError) throw stagesError
    stages.value = stagesData || []

    const { data: leadsData, error: leadsError } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (leadsError) throw leadsError
    leads.value = leadsData || []
  } catch (err: any) {
    console.error('Error fetching leads:', err)
    error.value = err.message || err
  } finally {
    loading.value = false
  }
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

  const lead = leads.value.find((l: any) => l.id === id)
  const isQual = ['qualificado', 'convertido', 'agendado', 'negociacao', 'visita', 'fechado'].includes(stageObj.estagio)
  if (lead) {
    lead.stage_id = stageObj.id
    lead.stage = stageObj.estagio
    lead.is_qualified = isQual
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

const openLeadDetails = (lead: Cliente) => {
  selectedLead.value = lead
  showModal.value = true
}

const openChat = (leadId: string) => {
  navigateTo(`/chats?clientId=${leadId}`)
}

const handleNotesUpdate = async (id: string, notes: string) => {
  const lead = leads.value.find((l: any) => l.id === id)
  if (lead) {
    lead.about = notes
  }
  try {
    await supabase.from('leads').update({ about: notes }).eq('id', id)
  } catch (err) {
    console.error('Error updating notes:', err)
  }
}

let realtimeChannel: any

const setupRealtime = () => {
  realtimeChannel = supabase.channel('crm_leads_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          if (!leads.value.find((l: any) => l.id === payload.new.id)) {
            leads.value.unshift(payload.new)
          }
        } else if (payload.eventType === 'UPDATE') {
          const idx = leads.value.findIndex((l: any) => l.id === payload.new.id)
          if (idx !== -1) {
            leads.value[idx] = { ...leads.value[idx], ...payload.new }
            leads.value = [...leads.value] // Força a reatividade no KanbanBoard
          } else {
            // Se foi atualizado mas não tava na lista (ex: paginação futura), coloca na lista
            leads.value.unshift(payload.new)
            leads.value = [...leads.value]
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

    <main :class="[mainMargin, 'px-4 py-5 sm:px-6 lg:p-10 h-[calc(100dvh-4rem)] md:h-screen overflow-hidden flex flex-col transition-all duration-300']">
      <!-- Header -->
      <header class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-5 lg:mb-8">
        <div class="flex items-center gap-4">
          <div class="p-2.5 bg-primary-50 dark:bg-primary-500/10 rounded-xl text-primary-500">
             <MessageSquare class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-tight flex items-center gap-3">
              Pipeline de Negociações
              <span v-if="!loading" class="text-xs font-medium text-gray-500 dark:text-dark-muted px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-dark-card border border-gray-200 dark:border-dark-border">
                {{ leads.length }} interessados
              </span>
            </h1>
            <p class="text-gray-400 dark:text-dark-muted text-sm mt-0.5">Gerencie os interessados nos imóveis.</p>
          </div>
        </div>
        
        <div class="flex items-center gap-2 overflow-x-auto max-w-full pb-1 lg:pb-0">
          <button 
            @click="downloadCSV"
            class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-medium transition-colors shadow-sm"
          >
            <Download class="w-4 h-4 text-primary-500" /> <span class="hidden sm:inline">Exportar CSV</span>
          </button>

          <!-- View Toggle -->
          <div class="bg-white dark:bg-dark-surface p-1 rounded-xl border border-gray-100 dark:border-dark-border shadow-card flex gap-1 transition-colors duration-300">
            <button 
              @click="currentView = 'kanban'"
              :class="[
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                currentView === 'kanban' ? 'bg-primary-500 text-white shadow-luxury' : 'text-gray-500 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <KanbanSquare class="w-4 h-4" /> Kanban
            </button>
            
            <button 
              @click="currentView = 'table'"
              :class="[
                 'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                 currentView === 'table' ? 'bg-primary-500 text-white shadow-luxury' : 'text-gray-500 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <TableIcon class="w-4 h-4" /> Tabela
            </button>
          </div>
        </div>
      </header>

      <!-- Content Area -->
      <div class="flex-1 overflow-hidden relative">
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center z-10 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm transition-colors duration-300">
           <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>

        <Transition name="fade" mode="out-in">
          <KanbanBoard 
            v-if="currentView === 'kanban'" 
            :leads="leads" 
            :stages="stages"
            @update-status="handleStatusUpdate"
            @view-details="openLeadDetails"
          />
          <LeadTable 
            v-else 
            :leads="leads"
            @view-details="openLeadDetails"
            @open-chat="openChat"
          />
        </Transition>
      </div>
    </main>
  </div>

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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
