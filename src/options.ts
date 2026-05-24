const PRESETS: Record<string, { apiUrl: string; model: string }> = {
  anthropic: { apiUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  ollama:    { apiUrl: 'http://localhost:11434/v1',    model: 'llama3.2' },
  openai:    { apiUrl: 'https://api.openai.com/v1',    model: 'gpt-4.1-mini' },
}

function providerRequiresApiKey(apiUrl: string): boolean {
  try {
    const { hostname } = new URL(apiUrl)
    return !['localhost', '127.0.0.1', '::1'].includes(hostname)
  } catch {
    return true
  }
}

function highlightMatchingPreset() {
  const url = (document.getElementById('apiUrl') as HTMLInputElement).value.trim()
  Object.keys(PRESETS).forEach(name => {
    const btn = document.getElementById('preset-' + name)!
    btn.classList.toggle('active', PRESETS[name].apiUrl === url)
  })
}

function applyPreset(name: string) {
  ;(document.getElementById('apiUrl') as HTMLInputElement).value = PRESETS[name].apiUrl
  ;(document.getElementById('model')  as HTMLInputElement).value = PRESETS[name].model
  highlightMatchingPreset()
}

function saveSettings() {
  const apiUrl = (document.getElementById('apiUrl') as HTMLInputElement).value.trim()
  const model  = (document.getElementById('model')  as HTMLInputElement).value.trim()
  const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value.trim()

  if (!apiUrl) { showStatus('error', 'Please enter an API URL'); return }
  if (!model)  { showStatus('error', 'Please enter a model name'); return }

  const isAnthropic = apiUrl.includes('anthropic.com')
  const isOpenAI = apiUrl.includes('api.openai.com')
  if (providerRequiresApiKey(apiUrl) && !apiKey) {
    showStatus('error', 'Please enter an API key for this provider'); return
  }
  if (isAnthropic && apiKey && !apiKey.startsWith('sk-ant-')) {
    showStatus('error', 'Anthropic key should start with sk-ant-'); return
  }
  if (isOpenAI && apiKey && !apiKey.startsWith('sk-')) {
    showStatus('error', 'OpenAI key should start with sk-'); return
  }

  chrome.storage.local.set({ apiUrl, model, apiKey }, () => {
    showStatus('success', '✓ Settings saved')
  })
}

function resetSettings() {
  chrome.storage.local.remove(['apiKey', 'apiUrl', 'model'], () => {
    ;(document.getElementById('apiUrl') as HTMLInputElement).value = PRESETS.anthropic.apiUrl
    ;(document.getElementById('model')  as HTMLInputElement).value = PRESETS.anthropic.model
    ;(document.getElementById('apiKey') as HTMLInputElement).value = ''
    highlightMatchingPreset()
    showStatus('error', 'Settings cleared')
  })
}

function showStatus(type: string, message: string) {
  const el = document.getElementById('status')!
  el.innerHTML = ''
  const badge = document.createElement('div')
  badge.className = 'badge badge-' + type
  badge.textContent = message
  el.appendChild(badge)
  if (type === 'success') setTimeout(() => { el.innerHTML = '' }, 3000)
}

// Wire up buttons
document.getElementById('preset-anthropic')!.addEventListener('click', () => applyPreset('anthropic'))
document.getElementById('preset-ollama')!.addEventListener('click',    () => applyPreset('ollama'))
document.getElementById('preset-openai')!.addEventListener('click',    () => applyPreset('openai'))
document.getElementById('btn-save')!.addEventListener('click', saveSettings)
document.getElementById('btn-reset')!.addEventListener('click', resetSettings)
document.getElementById('apiUrl')!.addEventListener('input', highlightMatchingPreset)

// Load saved settings on open
chrome.storage.local.get(['apiKey', 'apiUrl', 'model'], (stored) => {
  ;(document.getElementById('apiUrl') as HTMLInputElement).value = stored['apiUrl']  || PRESETS.anthropic.apiUrl
  ;(document.getElementById('model')  as HTMLInputElement).value = stored['model']   || PRESETS.anthropic.model
  ;(document.getElementById('apiKey') as HTMLInputElement).value = stored['apiKey']  || ''
  highlightMatchingPreset()
})
