<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { UserCircle, Phone, Search, Filter, Pencil, Trash2, Power, Plus, Eye } from 'lucide-vue-next'
import CorretorModal from '@/components/corretores/CorretorModal.vue'
import CorretorLeadsModal from '@/components/corretores/CorretorLeadsModal.vue'

const { mainMargin } = useSidebarState()
const supabase = useSupabaseClient()

const corretores = ref<any[]>([])

const loading = ref(true)
const searchQuery = ref('')
const showFilters = ref(false)
const filterStatus = ref<'todos' | 'ativo' | 'desativado'>('todos')

const showModal = ref(false)
const selectedCorretor = ref<any>(null)

const showLeadsModal = ref(false)
const selectedCorretorForLeads = ref<any>(null)

// Load corretores from DB
const fetchCorretores = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('corretores')
      .select('*, leads(count)')
      .order('nome', { ascending: true })
    
    if (error) throw error
    corretores.value = (data || []).map((c: any) => ({
      ...c,
      leads_count: c.leads?.[0]?.count || 0
    }))
  } catch (err: any) {
    console.error('Erro ao carregar corretores:', err.message)
    alert('Não foi possível carregar os corretores.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCorretores()
})

// Filtered corretores based on search + filters
const filteredCorretores = computed(() => {
  let result = [...corretores.value]

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((corretor) => 
      (corretor.nome?.toLowerCase().includes(query)) ||
      (corretor.telefone?.toLowerCase().includes(query))
    )
  }

  if (filterStatus.value !== 'todos') {
    const isActive = filterStatus.value === 'ativo'
    result = result.filter((c) => c.ativo === isActive)
  }

  return result
})

const hasActiveFilters = computed(() => filterStatus.value !== 'todos')

const clearFilters = () => {
  filterStatus.value = 'todos'
}

// Ações Reais DB
const toggleStatus = async (corretor: any) => {
  const newStatus = !corretor.ativo
  try {
    const { error } = await supabase
      .from('corretores')
      .update({ ativo: newStatus })
      .eq('id', corretor.id)
    
    if (error) throw error
    corretor.ativo = newStatus
  } catch (err: any) {
    console.error('Erro ao atualizar status:', err.message)
    alert('Erro ao atualizar o status do corretor.')
  }
}

const editCorretor = (corretor: any) => {
  selectedCorretor.value = corretor
  showModal.value = true
}

const openNewCorretorModal = () => {
  selectedCorretor.value = null
  showModal.value = true
}

const openLeadsModal = (corretor: any) => {
  selectedCorretorForLeads.value = corretor
  showLeadsModal.value = true
}

const handleSave = async (corretorData: any) => {
  try {
    if (corretorData.id) {
      // Edit existing
      const { error } = await supabase
        .from('corretores')
        .update({ 
          nome: corretorData.nome, 
          telefone: corretorData.telefone, 
          ativo: corretorData.ativo 
        })
        .eq('id', corretorData.id)
      
      if (error) throw error
    } else {
      // Create new
      const { error } = await supabase
        .from('corretores')
        .insert([{ 
          nome: corretorData.nome, 
          telefone: corretorData.telefone, 
          ativo: corretorData.ativo 
        }])
      
      if (error) throw error
    }
    
    showModal.value = false
    await fetchCorretores()
  } catch (err: any) {
    console.error('Erro ao salvar corretor:', err.message)
    alert('Erro ao salvar corretor.')
  }
}

const deleteCorretor = async (corretor: any) => {
  if (confirm(`Tem certeza que deseja excluir o corretor ${corretor.nome}?`)) {
    try {
      const { error } = await supabase
        .from('corretores')
        .delete()
        .eq('id', corretor.id)
      
      if (error) throw error
      corretores.value = corretores.value.filter(c => c.id !== corretor.id)
    } catch (err: any) {
      console.error('Erro ao excluir corretor:', err.message)
      alert('Erro ao excluir corretor.')
    }
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white font-sans selection:bg-primary-500 selection:text-white transition-colors duration-300">
    <Sidebar />

    <main :class="[mainMargin, 'px-4 py-5 sm:px-6 lg:p-10 transition-all duration-300']">
      <!-- Header -->
      <header class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Corretores</h1>
        <p class="text-gray-400 dark:text-dark-muted text-sm mt-1">Lista de todos os corretores e suas atribuições</p>
      </header>

      <!-- Main Card -->
      <div class="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden shadow-sm transition-colors">
        
        <!-- Card Header with Icon and Count -->
        <div class="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-dark-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-xl">
              <UserCircle class="w-5 h-5 text-primary-600 dark:text-primary-500" />
            </div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">Diretório de Corretores</h2>
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

            <!-- New Button -->
            <button 
              @click="openNewCorretorModal"
              class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg shadow-sm transition-colors"
            >
              <Plus class="w-3.5 h-3.5" />
              Novo Corretor
            </button>

            <span class="bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 shadow-inner ml-2">
              {{ filteredCorretores.length }} de {{ corretores.length }}
            </span>
          </div>
        </div>

        <!-- Filters Panel -->
        <Transition name="slide">
          <div v-if="showFilters" class="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gray-50/80 dark:bg-dark-card/30">
            <div class="flex flex-wrap items-center gap-6">
              <!-- Status Filter -->
              <div class="flex items-center gap-3">
                <span class="text-[11px] font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider">Status</span>
                <div class="flex gap-1.5 bg-white dark:bg-dark-surface p-1 rounded-xl border border-gray-100 dark:border-dark-border">
                  <button 
                    v-for="opt in [{ value: 'todos', label: 'Todos' }, { value: 'ativo', label: 'Ativo' }, { value: 'desativado', label: 'Desativado' }]"
                    :key="opt.value"
                    @click="filterStatus = opt.value as any"
                    :class="['px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', filterStatus === opt.value ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card']"
                  >
                    {{ opt.label }}
                  </button>
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
              placeholder="Buscar corretor por nome ou telefone..."
              class="w-full bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl pl-12 pr-4 py-3 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-sm transition-all"
            />
          </div>
        </div>

        <!-- Table Header -->
        <div class="hidden md:grid px-6 py-3 bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border grid-cols-12 gap-4 text-xs font-bold text-gray-500 dark:text-dark-muted uppercase tracking-wider">
          <div class="col-span-4">Nome</div>
          <div class="col-span-3">Telefone</div>
          <div class="col-span-2 text-center">Quantidade de Leads</div>
          <div class="col-span-3 text-right">Ações</div>
        </div>

        <!-- Contact List -->
        <div class="divide-y divide-gray-200 dark:divide-dark-border">
          <!-- Loading State -->
          <div v-if="loading" class="p-12 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>

          <!-- Empty State -->
          <div v-else-if="filteredCorretores.length === 0" class="p-12 text-center">
            <p class="text-gray-500 dark:text-dark-muted">Nenhum corretor encontrado</p>
          </div>

          <!-- Corretor Rows -->
          <div
            v-else
            v-for="corretor in filteredCorretores"
            :key="corretor.id"
            class="px-4 sm:px-6 py-4 bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-white/5 transition-all group flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 md:items-center"
          >
            <!-- Name & Avatar -->
            <div class="w-full md:col-span-4 flex items-center gap-4">
              <div v-if="corretor.media_url" class="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden border border-gray-200 dark:border-dark-border shadow-sm">
                <img :src="corretor.media_url" :alt="corretor.nome || 'Avatar'" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-500 flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm">
                {{ (corretor.nome || 'C').charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="font-bold text-gray-900 dark:text-white text-base truncate group-hover:text-primary-500 transition-colors">
                  {{ corretor.nome || 'Desconhecido' }}
                </h3>
              </div>
            </div>

            <!-- Phone -->
            <div class="w-full md:col-span-3 flex items-center gap-2 text-sm text-gray-500 dark:text-dark-muted pl-14 md:pl-0">
              <Phone class="w-3.5 h-3.5" />
              <span>{{ corretor.telefone || '' }}</span>
            </div>

            <!-- Leads Count -->
            <div class="w-full md:col-span-2 flex items-center md:justify-center pl-14 md:pl-0">
              <span class="inline-flex items-center justify-center px-3 py-1 text-xs font-bold bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20 rounded-full shadow-sm">
                {{ corretor.leads_count || 0 }} leads
              </span>
            </div>

            <!-- Actions -->
            <div class="w-full md:col-span-3 flex items-center justify-start md:justify-end gap-2 pl-14 md:pl-0 overflow-x-auto">
              
              <!-- Toggle Status Button -->
              <button
                @click.stop="toggleStatus(corretor)"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all w-[105px] justify-center',
                  corretor.ativo
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20' 
                    : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20'
                ]"
                :title="corretor.ativo ? 'Desativar Corretor' : 'Ativar Corretor'"
              >
                <Power class="w-3.5 h-3.5" />
                {{ corretor.ativo ? 'Ativo' : 'Desativado' }}
              </button>

              <div class="h-6 w-px bg-gray-200 dark:bg-dark-border mx-1"></div>

              <!-- View Leads Button -->
              <button 
                @click.stop="openLeadsModal(corretor)"
                class="p-2 text-primary-500 hover:text-white hover:bg-primary-500 rounded-lg transition-colors border border-transparent hover:border-primary-600"
                title="Ver Leads do Corretor"
              >
                <Eye class="w-4 h-4" />
              </button>

              <!-- Edit Button -->
              <button 
                @click.stop="editCorretor(corretor)"
                class="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
                title="Editar Corretor"
              >
                <Pencil class="w-4 h-4" />
              </button>

              <!-- Delete Button -->
              <button 
                @click.stop="deleteCorretor(corretor)"
                class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                title="Excluir Corretor"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <CorretorModal
      v-model="showModal"
      :corretor="selectedCorretor"
      @save="handleSave"
    />

    <CorretorLeadsModal
      v-model="showLeadsModal"
      :corretor="selectedCorretorForLeads"
    />
  </div>
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
