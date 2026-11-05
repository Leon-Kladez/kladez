import type { serverCustomAppGuardEn } from '../en/serverCustomAppGuard.js'

export const serverCustomAppGuardRu: Record<keyof typeof serverCustomAppGuardEn, string> = {
  'server.customAppGuard.volumeHostPathMustBe': 'Папка на компьютере «{hostPath}» должна быть указана полным путём.',
  'server.customAppGuard.volumeContainerPathMustBe': 'Папка в контейнере «{containerPath}» должна быть указана полным путём.',
  'server.customAppGuard.volumePathsMustNotContain': 'В путях папок не должно быть двоеточия («:»): «{hostPath}» → «{containerPath}».',
  'server.customAppGuard.mountingTheDockerSocketIs': 'Подключать сокет Docker («{hostPath}») нельзя — это даёт полный контроль над компьютером.',
  'server.customAppGuard.mountingSystemDirectoryIsNot': 'Подключать системную папку «{hostPath}» нельзя.',
  'server.customAppGuard.mountingWouldExposeProjectNomad': 'Подключение «{hostPath}» откроет доступ к файлам самой программы — так нельзя.',
  'server.customAppGuard.volumeIsOutsideTheManaged': 'Папка «{hostPath}» лежит вне хранилища программы ({storageRoot}). Давайте этому образу доступ к ней, только если ему доверяете.',
  'server.customAppGuard.isNotAValidImage': '«{image}» — неверное название образа.',
  'server.customAppGuard.imageIsFromWhichIs': 'Образ взят из «{registry}» — это не из проверенных хранилищ образов. Устанавливайте только то, чему доверяете.',
  'server.customAppGuard.imageUsesAMovingTag': 'Образ «{image}» указан без точной версии ({tag}). Чтобы установка повторялась одинаково, укажите конкретную версию.',
  'server.customAppGuard.noTag': 'версия не указана',
}
