<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import { 
  LayoutDashboard, 
  KanbanSquare, 
  MessageSquare, 
  Users, 
  UserCircle, 
  BarChart3, 
  LogOut, 
  Building, 
  ChevronsLeft, 
  ChevronsRight, 
  RefreshCw, 
  Globe, 
  Settings, 
  CalendarDays, 
  Clock 
} from 'lucide-vue-next'

const { isCollapsed, toggleSidebar } = useSidebarState()
const supabase = useSupabaseClient<any>()
const currentUser = useSupabaseUser()

const leadsCount = ref(0)
const semCorretorCount = ref(0)
const clinicId = ref<string | null>(null)
let realtimeChannel: any

const fetchLeadsCount = async () => {
  try {
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      
    if (!error && count !== null) {
      leadsCount.value = count
    }

    const { count: unassignedCount, error: unassignedError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .is('corretor_id', null)

    if (!unassignedError && unassignedCount !== null) {
      semCorretorCount.value = unassignedCount
    }
  } catch (err) {
    console.error('Error fetching leads count:', err)
  }
}

const fetchClinicId = async () => {
  try {
    const { data: rpcData } = await supabase.rpc('get_auth_clinic_id')
    if (rpcData) { clinicId.value = rpcData; return }

    const { data: sessionData } = await supabase.auth.getUser()
    if (sessionData?.user?.user_metadata?.clinic_id) {
      clinicId.value = sessionData.user.user_metadata.clinic_id; return
    }

    const { data: leadData } = await supabase.from('leads').select('clinic_id').limit(1).single()
    if (leadData) clinicId.value = leadData.clinic_id
  } catch (err) {
    console.error('Erro ao buscar clinic_id:', err)
  }
}

onMounted(() => {
  fetchLeadsCount()
  fetchClinicId()
  
  realtimeChannel = supabase.channel('sidebar_leads_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads' },
      () => {
        fetchLeadsCount()
      }
    )
    .subscribe()
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
})

const navigation = computed(() => [
  { name: 'PRINCIPAL', items: [
    { name: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
    { name: 'Negociações', icon: KanbanSquare, route: '/crm', badge: leadsCount.value > 0 ? String(leadsCount.value) : undefined },
    { name: 'Contatos', icon: Users, route: '/contatos' },
    { name: 'Corretores', icon: UserCircle, route: '/corretores' },
    { name: 'Visitas', icon: CalendarDays, route: '/agenda' },
    { name: 'Leads Espera', icon: Clock, route: '/semcorretor', badge: semCorretorCount.value > 0 ? String(semCorretorCount.value) : undefined },
  ]},
  { name: 'GESTÃO', items: [
    { name: 'Imóveis', icon: Building, route: '/inventario' },
    { name: 'Conversas', icon: MessageSquare, route: '/chats' },
    { name: 'Relatórios', icon: BarChart3, route: '/relatorios' },
    { name: 'Reativar Interessados', icon: RefreshCw, route: '#', badge: 'PRO', disabled: true },
  ]},
  { name: 'ADMINISTRAÇÃO', items: [
    { name: 'Catálogo Público', icon: Globe, route: '#', badge: 'PRO', disabled: true },
    { name: 'Configurações', icon: Settings, route: '/configuracoes' },
  ]}
])

const handleLogout = async () => {
  await supabase.auth.signOut()
  await navigateTo('/login', { replace: true })
}
</script>

<template>
  <aside 
    :class="[
      'h-screen bg-white/95 dark:bg-dark-bg/95 backdrop-blur-2xl border-r border-gray-100 dark:border-dark-border flex flex-col fixed left-0 top-0 overflow-hidden z-50 sidebar-transition select-none',
      isCollapsed ? 'w-20' : 'w-64'
    ]"
  >
    <!-- Header / Logo -->
    <div class="h-14 flex items-center border-b border-gray-100 dark:border-dark-border flex-shrink-0" :class="isCollapsed ? 'px-3 justify-center' : 'px-4 justify-between'">
      <div class="flex items-center gap-2.5 group cursor-pointer" :class="isCollapsed ? 'justify-center' : ''">
         <div class="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shadow-luxury sidebar-transition group-hover:scale-105 flex-shrink-0">
            <Building class="w-4 h-4 text-white" />
         </div>
         <div v-if="!isCollapsed" class="sidebar-text-transition overflow-hidden">
           <span class="text-gray-900 dark:text-white font-black text-base tracking-tight block whitespace-nowrap leading-none">ESPLENDOR</span>
           <span class="text-[10px] text-gray-400 dark:text-dark-muted font-semibold whitespace-nowrap uppercase tracking-widest leading-none mt-0.5 block">Imóveis</span>
         </div>
      </div>
      <button 
        @click="toggleSidebar"
        class="p-1 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 sidebar-transition"
        :title="isCollapsed ? 'Expandir menu' : 'Recolher menu'"
      >
        <ChevronsLeft v-if="!isCollapsed" class="w-4 h-4" />
        <ChevronsRight v-else class="w-4 h-4" />
      </button>
    </div>

    <!-- Navigation -->
    <div class="flex-1 overflow-y-auto hide-scrollbar py-2" :class="isCollapsed ? 'px-2' : 'px-2.5'">
      <div v-for="section in navigation" :key="section.name" class="mb-2.5">
        <h3 
          v-if="!isCollapsed" 
          class="text-[10px] font-bold text-gray-400 dark:text-dark-muted uppercase tracking-[0.12em] px-3 mb-1 mt-1.5 sidebar-text-transition"
        >
          {{ section.name }}
        </h3>
        <div v-else class="h-px bg-gray-100 dark:bg-dark-border mb-2 mx-1"></div>
        
        <ul class="space-y-0.5">
          <li v-for="item in section.items" :key="item.name">
            <NuxtLink 
              :to="item.route" 
              :class="[
                'flex items-center rounded-lg text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-white/5 sidebar-transition group relative border-l-2 border-transparent',
                isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-1.5',
                (item as any).disabled ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''
              ]"
              active-class="!text-primary-500 !border-primary-500 !font-semibold bg-primary-50/50 dark:bg-primary-500/10"
              :title="isCollapsed ? item.name : undefined"
              :target="(item as any).external ? '_blank' : undefined"
            >
              <component 
                :is="item.icon" 
                class="w-[17px] h-[17px] sidebar-transition flex-shrink-0" 
              />
              
              <span v-if="!isCollapsed" class="flex-1 sidebar-text-transition truncate">{{ item.name }}</span>

              <!-- Badge -->
              <span 
                v-if="(item as any).badge && !isCollapsed" 
                class="bg-primary-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-sm flex-shrink-0"
              >
                {{ (item as any).badge }}
              </span>

              <!-- Collapsed badge dot -->
              <span 
                v-if="(item as any).badge && isCollapsed" 
                class="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full"
              ></span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <!-- Footer / User Profile & Actions -->
    <div class="p-2.5 border-t border-gray-100 dark:border-dark-border flex-shrink-0 bg-gray-50/50 dark:bg-dark-card/30">
      <div 
        :class="[
          'flex items-center sidebar-transition',
          isCollapsed ? 'flex-col gap-2 justify-center' : 'gap-2 justify-between'
        ]"
      >
        <!-- User Info -->
        <div class="flex items-center gap-2 min-w-0" :class="isCollapsed ? 'justify-center' : 'flex-1'">
          <!-- Avatar -->
          <div class="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xs flex-shrink-0 uppercase shadow-sm">
            {{ currentUser?.user_metadata?.full_name?.charAt(0) || currentUser?.email?.charAt(0) || 'U' }}
          </div>
          
          <div v-if="!isCollapsed" class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-gray-900 dark:text-white truncate leading-tight">
              {{ currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Corretor' }}
            </p>
            <p class="text-[10px] text-gray-400 dark:text-dark-muted font-medium leading-none mt-0.5">Admin</p>
          </div>
        </div>

        <!-- Controls: Theme Toggle & Logout -->
        <div class="flex items-center gap-0.5 flex-shrink-0" :class="isCollapsed ? 'flex-col' : ''">
          <ThemeToggle :compact="true" />
          <button 
            @click="handleLogout" 
            class="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" 
            title="Sair do Sistema"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-transition {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-text-transition {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
