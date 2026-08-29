<script setup lang="ts">
import { Eye, MessageCircle, Lock, Bot } from 'lucide-vue-next'
import type { Cliente, CrmStatus } from '@/types/crm'

defineProps<{
  leads: Cliente[]
}>()

const emit = defineEmits<{
  (e: 'view-details', lead: Cliente): void
  (e: 'open-chat', leadId: string): void
}>()

const statusConfig: Record<CrmStatus, { label: string; color: string }> = {
  novo: { label: 'Novo', color: 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400' },
  em_contato: { label: 'Em Contato', color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  qualificado: { label: 'Qualificado', color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  convertido: { label: 'Convertido', color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  perdido: { label: 'Perdido', color: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' },
}
</script>

<template>
  <div class="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border border-gray-100/50 dark:border-dark-border/50 rounded-sm overflow-hidden h-full flex flex-col shadow-card hover:shadow-card-hover transition-all duration-300">
    <div class="overflow-y-auto overflow-x-hidden flex-1">
      <table class="w-full table-fixed md:table-auto text-left border-collapse">
        <thead class="sticky top-0 z-10">
          <tr class="border-b border-gray-100 dark:border-dark-border text-gray-400 dark:text-dark-muted text-xs uppercase tracking-wider bg-gray-50/80 dark:bg-dark-card/80 backdrop-blur-sm">
            <th class="w-[44%] md:w-auto px-3 sm:px-4 md:px-6 py-4 font-medium">Nome</th>
            <th class="hidden md:table-cell px-6 py-4 font-medium">Telefone</th>
            <th class="w-[32%] md:w-auto px-2 sm:px-4 md:px-6 py-4 font-medium">Status</th>
            <th class="hidden md:table-cell px-6 py-4 font-medium">Cód. Imóvel</th>
            <th class="hidden md:table-cell px-6 py-4 font-medium">Modo</th>
            <th class="w-[24%] md:w-auto px-2 sm:px-4 md:px-6 py-4 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50 dark:divide-dark-border">
          <tr v-for="lead in leads" :key="lead.id" class="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
            <!-- Nome -->
            <td class="px-3 sm:px-4 md:px-6 py-4">
              <div class="flex items-center gap-3">
                 <div v-if="lead.media_url" class="w-9 h-9 rounded-sm flex-shrink-0 overflow-hidden border border-gray-100 dark:border-dark-border">
                    <img :src="lead.media_url" :alt="lead.name || 'Avatar'" class="w-full h-full object-cover" />
                 </div>
                 <div v-else class="w-9 h-9 rounded-sm bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-xs font-bold text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20">
                    {{ (lead.name || 'D').charAt(0).toUpperCase() }}
                 </div>
                 <span class="font-medium text-gray-900 dark:text-white text-sm leading-tight break-words">{{ lead.name || 'Desconhecido' }}</span>
              </div>
            </td>

            <!-- Telefone -->
            <td class="hidden md:table-cell px-6 py-4">
               <span class="text-gray-400 dark:text-dark-muted text-sm font-mono">{{ lead.remotejid }}</span>
            </td>

            <!-- Status -->
            <td class="px-2 sm:px-4 md:px-6 py-4">
              <span :class="['inline-flex max-w-full items-center md:gap-2 px-2 sm:px-3 py-1 rounded-sm text-[11px] sm:text-xs font-medium truncate', statusConfig[(lead.stage || lead.situacao_nome || lead.estagiokanbam) as CrmStatus]?.color || 'bg-gray-100 dark:bg-dark-card text-gray-500']">
                {{ statusConfig[(lead.stage || lead.situacao_nome || lead.estagiokanbam) as CrmStatus]?.label || lead.stage || lead.situacao_nome || lead.estagiokanbam || 'Novo' }}
              </span>
            </td>

            <!-- Código Imóvel -->
            <td class="hidden md:table-cell px-6 py-4 text-sm text-gray-400 dark:text-dark-muted font-mono">
              {{ lead.metadata?.propertyCode || 'N/A' }}
            </td>

             <!-- Modo -->
            <td class="hidden md:table-cell px-6 py-4 text-sm">
               <span v-if="!lead.agent_active" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500">
                  <Lock class="w-3 h-3" /> Desativado
               </span>
               <span v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
                  <Bot class="w-3 h-3" /> Ativado
               </span>
            </td>

            <!-- Ações -->
            <td class="px-2 sm:px-4 md:px-6 py-4 text-right">
               <div class="flex items-center justify-end gap-0.5 sm:gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                 <button 
                   @click="emit('open-chat', lead.id)"
                   class="w-10 h-10 md:w-auto md:h-auto md:p-2 flex items-center justify-center text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-sm transition-all"
                   title="Abrir Chat"
                 >
                   <MessageCircle class="w-4 h-4" />
                 </button>
                 <button 
                   @click="emit('view-details', lead)"
                   class="w-10 h-10 md:w-auto md:h-auto md:p-2 flex items-center justify-center text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-sm transition-all"
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
  </div>
</template>
