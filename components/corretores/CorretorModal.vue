<script setup lang="ts">
import { ref, watch } from 'vue'
import { User, Phone, Calendar, Power, X } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
  corretor: any | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', corretorData: any): void
}>()

// Form state
const formData = ref({
  id: null as string | null,
  nome: '',
  telefone: '+55 ',
  ativo: true
})

// Sync form when modal opens or corretor changes
watch(() => [props.modelValue, props.corretor], ([isOpen, newCorretor]) => {
  if (isOpen) {
    if (newCorretor) {
      // Edit mode
      formData.value = {
        id: (newCorretor as any).id,
        nome: (newCorretor as any).nome || '',
        telefone: (newCorretor as any).telefone || '+55 ',
        ativo: (newCorretor as any).ativo !== false
      }
    } else {
      // Create mode
      formData.value = {
        id: null,
        nome: '',
        telefone: '+55 ',
        ativo: true
      }
    }
  }
})

const close = () => emit('update:modelValue', false)

const handleSave = () => {
  if (!formData.value.nome || !formData.value.telefone) {
    alert('Nome e Telefone são obrigatórios.')
    return
  }
  emit('save', { ...formData.value })
}

const toggleStatus = () => {
  formData.value.ativo = !formData.value.ativo
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="modelValue" 
        class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
        @click.self="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-gray-900/40 dark:bg-black/80 backdrop-blur-sm"></div>
        
        <!-- Modal Card -->
        <div class="relative bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-t-2xl sm:rounded-xl shadow-luxury max-w-md w-full max-h-[94dvh] sm:max-h-[90vh] overflow-y-auto">
          
          <!-- Header -->
          <div class="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-dark-border sticky top-0 bg-white dark:bg-dark-surface z-10">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg text-primary-600 dark:text-primary-500">
                <User class="w-5 h-5" />
              </div>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ corretor ? 'Editar Corretor' : 'Novo Corretor' }}
              </h2>
            </div>
            <button 
              @click="close" 
              class="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Body Form -->
          <div class="p-6 space-y-5">
            
            <!-- Nome -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-gray-500 dark:text-dark-muted uppercase tracking-wider">Nome Completo</label>
              <div class="relative">
                <User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  v-model="formData.nome"
                  type="text" 
                  placeholder="Ex: João da Silva"
                  class="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                />
              </div>
            </div>

            <!-- Telefone -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-gray-500 dark:text-dark-muted uppercase tracking-wider">Telefone</label>
              <div class="relative">
                <Phone class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  v-model="formData.telefone"
                  type="text" 
                  placeholder="+55 11 99999-9999"
                  class="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-mono"
                />
              </div>
            </div>

            <!-- Status Toggle -->
            <div class="space-y-1.5 pt-2 border-t border-gray-100 dark:border-dark-border">
              <label class="text-xs font-semibold text-gray-500 dark:text-dark-muted uppercase tracking-wider block mb-3">Status da Conta</label>
              
              <div 
                @click="toggleStatus"
                class="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl cursor-pointer hover:border-primary-300 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <div :class="['p-2 rounded-lg', formData.ativo ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600' : 'bg-red-100 dark:bg-red-500/20 text-red-600']">
                    <Power class="w-4 h-4" />
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-gray-900 dark:text-white">{{ formData.ativo ? 'Ativo' : 'Desativado' }}</h4>
                    <p class="text-xs text-gray-500 dark:text-dark-muted">
                      {{ formData.ativo ? 'O corretor pode receber novos leads.' : 'O corretor não receberá novos leads.' }}
                    </p>
                  </div>
                </div>

                <!-- Custom Switch -->
                <div :class="['relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none', formData.ativo ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600']">
                  <span aria-hidden="true" :class="['pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out', formData.ativo ? 'translate-x-5' : 'translate-x-0']"></span>
                </div>
              </div>

            </div>

          </div>

          <!-- Footer Actions -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface/50 rounded-b-xl">
            <button
              @click="close"
              class="px-4 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              @click="handleSave"
              class="px-5 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg shadow-sm transition-colors"
            >
              Salvar
            </button>
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
</style>
