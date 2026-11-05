export const serverDockerEn = {
  'serverDocker.port': 'port {port}',
  'serverDocker.somePort': 'a required port',
  'serverDocker.portBusyOllama': 'Couldn\'t start because {portText} is already in use on this machine. This usually means Ollama is already installed and running directly on the host (outside NOMAD). Stop and disable the host Ollama service (e.g. "sudo systemctl stop ollama" then "sudo systemctl disable ollama"), then try again.',
  'serverDocker.portBusy': 'Couldn\'t start because {portText} is already in use on this machine. Stop whatever is using {portText} on the host, then try again.',
} as const
