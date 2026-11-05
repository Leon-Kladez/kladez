export const serverCustomAppGuardEn = {
  'server.customAppGuard.volumeHostPathMustBe': 'Volume host path "{hostPath}" must be an absolute path.',
  'server.customAppGuard.volumeContainerPathMustBe': 'Volume container path "{containerPath}" must be an absolute path.',
  'server.customAppGuard.volumePathsMustNotContain': 'Volume paths must not contain a colon (":"): "{hostPath}" → "{containerPath}".',
  'server.customAppGuard.mountingTheDockerSocketIs': 'Mounting the Docker socket ("{hostPath}") is not allowed — it grants full host control.',
  'server.customAppGuard.mountingSystemDirectoryIsNot': 'Mounting system directory "{hostPath}" is not allowed.',
  'server.customAppGuard.mountingWouldExposeProjectNomad': 'Mounting "{hostPath}" would expose project-nomad\'s own files and is not allowed.',
  'server.customAppGuard.volumeIsOutsideTheManaged': 'Volume "{hostPath}" is outside the managed storage root ({storageRoot}). Make sure you trust this image with access to that path.',
  'server.customAppGuard.isNotAValidImage': '"{image}" is not a valid image reference.',
  'server.customAppGuard.imageIsFromWhichIs': 'Image is from "{registry}", which is outside project-nomad\'s trusted registries. Only install images you trust.',
  'server.customAppGuard.imageUsesAMovingTag': 'Image "{image}" uses a moving tag ({tag}). Pin a specific version for reproducible installs.',
  'server.customAppGuard.noTag': 'no tag',
} as const
