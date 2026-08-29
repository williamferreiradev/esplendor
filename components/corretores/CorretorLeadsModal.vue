<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Eye, X, Phone, User } from 'lucide-vue-next'
import type { Cliente } from '@/types/crm'

const props = defineProps<{
  modelValue: boolean
  corretor: any | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const supabase = useSupabaseClient()
const leads = ref<Cliente[]>([])
const loading = ref(false)

// Fetch leads when modal opens and corretor is set
watch(() => [props.modelValue, props.corretor], async ([isOpen, currentCorretor]) => {
  if (isOpen && currentCorretor && currentCorretor.id) {
    await fetchLeads(currentCorretor.id)
  } else {
    leads.value = []
  }
})

const fetchLeads = async (corretorId: string) => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('corretor_id', corretorId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    leads.value = (data || []) as Cliente[]
  } catch (err: any) {
    console.error('Erro ao buscar leads do corretor:', err.message)
  } finally {
    loading.value = false
  }
}

const close = () => {
  emit('update:modelValue', false)
}

const formatPhone = (phone?: string | null, remotejid?: string | null) => {
  const raw = phone || remotejid || ''
  return raw.replace('@c.us', '')
}

const getStageLabel = (lead: Cliente) => {
  const leadStage = lead.stage || lead.estagiokanbam || 'novo'
  const fallbackOptions: Record<string, string> = {
    novo: 'Novo',
    qualificando: 'Qualificando',
    qualificado: 'Qualificado',
    agendado: 'Visita',
    fechado: 'Fechado',
    convertido: 'Fechado',
    perdido: 'Perdido'
  }
  return fallbackOptions[leadStage] || leadStage
}

const getStageBadgeClasses = (lead: Cliente) => {
  const leadStage = lead.stage || lead.estagiokanbam || 'novo'
  switch (leadStage) {
    case 'novo':
      return 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
    case 'em_atendimento':
    case 'qualificando':
      return 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20'
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
      return 'bg-gray-100 dark:bg-dark-bg text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-dark-border'
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="modelValue && corretor" 
        class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
        @click.self="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-gray-900/40 dark:bg-black/80 backdrop-blur-sm"></div>
        
        <!-- Modal Card -->
        <div class="relative bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-t-2xl sm:rounded-sm shadow-luxury max-w-4xl w-full max-h-[94dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
          
          <!-- Header -->
          <div class="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface z-10 flex-shrink-0">
            <div class="flex items-center gap-3">
              <Eye class="w-5 h-5 text-primary-500" />
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">Detalhes do Corretor</h2>
            </div>
            <button 
              @click="close" 
              class="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-sm transition-all"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 flex-1 overflow-y-auto">
            
            <!-- Corretor Info -->
            <div class="flex items-center gap-4 mb-8 border-b border-gray-200 dark:border-dark-border pb-6">
              <div v-if="corretor.media_url" class="w-16 h-16 rounded-sm flex-shrink-0 overflow-hidden border border-gray-200 dark:border-dark-border shadow-sm">
                <img :src="corretor.media_url" :alt="corretor.nome || 'Avatar'" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-16 h-16 rounded-sm bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-500 font-bold text-2xl flex-shrink-0 shadow-sm border border-transparent">
                {{ (corretor.nome || 'C').charAt(0).toUpperCase() }}
              </div>
              <div class="space-y-1">
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ corretor.nome || 'Desconhecido' }}</p>
                <div class="flex items-center gap-2 text-gray-500 dark:text-dark-muted">
                  <Phone class="w-4 h-4" />
                  <span>{{ corretor.telefone || 'Não informado' }}</span>
                </div>
              </div>
            </div>

            <!-- Leads Section -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Leads Atribuídos</h3>
                <span class="px-2 py-1 bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-400 text-xs font-bold rounded-full">
                  {{ leads.length }} {{ leads.length === 1 ? 'lead' : 'leads' }}
                </span>
              </div>

              <!-- Loading State -->
              <div v-if="loading" class="flex justify-center items-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>

              <!-- Empty State -->
              <div v-else-if="leads.length === 0" class="text-center py-12 bg-gray-50 dark:bg-dark-bg/50 rounded-sm border border-dashed border-gray-200 dark:border-dark-border">
                <p class="text-gray-500 dark:text-dark-muted">Nenhum lead atribuído a este corretor no momento.</p>
              </div>

              <!-- Horizontal Scrollable Leads Container -->
              <div v-else class="flex overflow-x-auto gap-4 py-2 px-1 pb-4 snap-x">
                
                <div 
                  v-for="lead in leads" 
                  :key="lead.id" 
                  class="snap-start flex-shrink-0 w-64 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-sm shadow-sm p-4 flex flex-col gap-3 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                >
                  <div class="flex items-center gap-3">
                    <div v-if="lead.media_url" class="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border border-gray-100 dark:border-dark-border">
                      <img :src="lead.media_url" :alt="lead.name || 'Avatar'" class="w-full h-full object-cover" />
                    </div>
                    <div v-else class="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-sm flex-shrink-0 border border-primary-100 dark:border-primary-800">
                      {{ (lead.name || 'L').charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <h4 class="font-bold text-gray-900 dark:text-white text-sm truncate" :title="lead.name">{{ lead.name || 'Desconhecido' }}</h4>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-muted">
                    <Phone class="w-3.5 h-3.5" />
                    <span class="truncate">{{ formatPhone(lead.phone, lead.remotejid) }}</span>
                  </div>

                  <div class="mt-auto pt-2 border-t border-gray-100 dark:border-dark-border">
                    <span :class="['inline-flex px-2 py-0.5 rounded-sm text-[10px] font-bold border', getStageBadgeClasses(lead)]">
                      {{ getStageLabel(lead) }}
                    </span>
                  </div>
                </div>

              </div>
            </div>
            
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}

/* Custom scrollbar for horizontal scrolling */
.overflow-x-auto::-webkit-scrollbar {
  height: 6px;
}
.overflow-x-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-x-auto::-webkit-scrollbar-thumb {
  background-color: #cbd5e1; /* Tailwind slate-300 */
  border-radius: 10px;
}
.dark .overflow-x-auto::-webkit-scrollbar-thumb {
  background-color: #334155; /* Tailwind slate-700 */
}
</style>
