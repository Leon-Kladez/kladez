// Исходный английский текст Project NOMAD — дословно. По нему сверяются обновления от авторов NOMAD.
// Словарь собран из файлов по областям в папке en/.
import { testEn } from './en/test.js'
import { commonEn } from './en/common.js'
import { navEn } from './en/nav.js'
import { mapsEn } from './en/maps.js'
import { diskEn } from './en/disk.js'
import { installEn } from './en/install.js'
import { errorsEn } from './en/errors.js'
import { aboutEn } from './en/about.js'
import { kbEn } from './en/kb.js'
import { timeEn } from './en/time.js'
import { benchmarkEn } from './en/benchmark.js'
import { themeEn } from './en/theme.js'
import { storageEn } from './en/storage.js'
import { debugEn } from './en/debug.js'
import { serviceLogsEn } from './en/serviceLogs.js'
import { categoryEn } from './en/category.js'
import { mapsDownloadUrlEn } from './en/mapsDownloadUrl.js'
import { collectionEn } from './en/collection.js'
import { tableEn } from './en/table.js'
import { downloadEn } from './en/download.js'
import { builderTagEn } from './en/builderTag.js'
import { whatsNewEn } from './en/whatsNew.js'
import { modelDownloadEn } from './en/modelDownload.js'
import { serviceStatsEn } from './en/serviceStats.js'
import { creatorPacksEn } from './en/creatorPacks.js'
import { appUrlEn } from './en/appUrl.js'
import { kbGuardrailEn } from './en/kbGuardrail.js'
import { wikipediaEn } from './en/wikipedia.js'
import { updateServiceEn } from './en/updateService.js'
import { customAppEn } from './en/customApp.js'
import { autoUpdateEn } from './en/autoUpdate.js'
import { contentUpdatesEn } from './en/contentUpdates.js'
import { tierEn } from './en/tier.js'
import { gpuEn } from './en/gpu.js'
import { benchRunEn } from './en/benchRun.js'
import { countryPickerEn } from './en/countryPicker.js'
import { continentEn } from './en/continent.js'
import { linkTileEn } from './en/linkTile.js'
import { pinsEn } from './en/pins.js'
import { durationEn } from './en/duration.js'
import { drugDisclaimerEn } from './en/drugDisclaimer.js'
import { drugIngestEn } from './en/drugIngest.js'
import { drugEn } from './en/drug.js'
import { safetyEn } from './en/safety.js'
import { uploadEn } from './en/upload.js'
import { homeEn } from './en/home.js'
import { easySetupEn } from './en/easySetup.js'
import { mapsPageEn } from './en/mapsPage.js'
import { zimManagerEn } from './en/zimManager.js'
import { appsEn } from './en/apps.js'
import { mapsManagerEn } from './en/mapsManager.js'
import { explorerEn } from './en/explorer.js'
import { depotEn } from './en/depot.js'
import { servicesEn } from './en/services.js'
import { chatEn } from './en/chat.js'
import { kbPolicyEn } from './en/kbPolicy.js'
import { nomadMdEn } from './en/nomadMd.js'
import { visionEn } from './en/vision.js'
import { kbFilesEn } from './en/kbFiles.js'
import { collectionsEn } from './en/collections.js'
import { advancedEn } from './en/advanced.js'
import { supportEn } from './en/support.js'
import { systemEn } from './en/system.js'
import { legalEn } from './en/legal.js'
import { updateEn } from './en/update.js'
import { modelsEn } from './en/models.js'
import { benchEn } from './en/bench.js'
import { drugRefEn } from './en/drugRef.js'
import { drugShowEn } from './en/drugShow.js'
import { compareEn } from './en/compare.js'
import { conditionsEn } from './en/conditions.js'
import { serverErrorEn } from './en/serverError.js'
import { serverBenchmarkControllerEn } from './en/serverBenchmarkController.js'
import { serverChatsControllerEn } from './en/serverChatsController.js'
import { serverConditionsControllerEn } from './en/serverConditionsController.js'
import { serverCreatorPacksControllerEn } from './en/serverCreatorPacksController.js'
import { serverDrugReferenceControllerEn } from './en/serverDrugReferenceController.js'
import { serverMapsControllerEn } from './en/serverMapsController.js'
import { serverNomadMdControllerEn } from './en/serverNomadMdController.js'
import { serverOllamaControllerEn } from './en/serverOllamaController.js'
import { serverRagControllerEn } from './en/serverRagController.js'
import { serverSettingsControllerEn } from './en/serverSettingsController.js'
import { serverSystemControllerEn } from './en/serverSystemController.js'
import { serverZimControllerEn } from './en/serverZimController.js'
import { serverAppAutoUpdateServiceEn } from './en/serverAppAutoUpdateService.js'
import { serverAutoUpdateServiceEn } from './en/serverAutoUpdateService.js'
import { serverBenchmarkServiceEn } from './en/serverBenchmarkService.js'
import { serverChatServiceEn } from './en/serverChatService.js'
import { serverCollectionUpdateServiceEn } from './en/serverCollectionUpdateService.js'
import { serverContentAutoUpdateServiceEn } from './en/serverContentAutoUpdateService.js'
import { serverCountriesServiceEn } from './en/serverCountriesService.js'
import { serverDockerServiceEn } from './en/serverDockerService.js'
import { serverDownloadServiceEn } from './en/serverDownloadService.js'
import { serverDrugReferenceServiceEn } from './en/serverDrugReferenceService.js'
import { serverMapServiceEn } from './en/serverMapService.js'
import { serverOllamaServiceEn } from './en/serverOllamaService.js'
import { serverRagServiceEn } from './en/serverRagService.js'
import { serverSystemServiceEn } from './en/serverSystemService.js'
import { serverSystemUpdateServiceEn } from './en/serverSystemUpdateService.js'
import { serverZimExtractionServiceEn } from './en/serverZimExtractionService.js'
import { serverZimServiceEn } from './en/serverZimService.js'
import { serverDownloadDrugDataJobEn } from './en/serverDownloadDrugDataJob.js'
import { serverDownloadModelJobEn } from './en/serverDownloadModelJob.js'
import { serverEmbedFileJobEn } from './en/serverEmbedFileJob.js'
import { serverIngestDrugDataJobEn } from './en/serverIngestDrugDataJob.js'
import { serverRunBenchmarkJobEn } from './en/serverRunBenchmarkJob.js'
import { serverRunDownloadJobEn } from './en/serverRunDownloadJob.js'
import { serverRunExtractPmtilesJobEn } from './en/serverRunExtractPmtilesJob.js'
import { serverBenchmarkStageEn } from './en/serverBenchmarkStage.js'
import { serverBenchmarkMsgEn } from './en/serverBenchmarkMsg.js'
import { serverPreflightEn } from './en/serverPreflight.js'
import { serverCustomAppGuardEn } from './en/serverCustomAppGuard.js'
import { serverValidateEn } from './en/serverValidate.js'
import { serverDockerEn } from './en/serverDocker.js'
import { serverOllamaEn } from './en/serverOllama.js'
import { serverBenchEn } from './en/serverBench.js'
import { serverZimEn } from './en/serverZim.js'
import { serverUpdateEn } from './en/serverUpdate.js'
import { serverAutoEn } from './en/serverAuto.js'

export const en = {
  ...testEn,
  ...commonEn,
  ...navEn,
  ...mapsEn,
  ...diskEn,
  ...installEn,
  ...errorsEn,
  ...aboutEn,
  ...kbEn,
  ...timeEn,
  ...benchmarkEn,
  ...themeEn,
  ...storageEn,
  ...debugEn,
  ...serviceLogsEn,
  ...categoryEn,
  ...mapsDownloadUrlEn,
  ...collectionEn,
  ...tableEn,
  ...downloadEn,
  ...builderTagEn,
  ...whatsNewEn,
  ...modelDownloadEn,
  ...serviceStatsEn,
  ...creatorPacksEn,
  ...appUrlEn,
  ...kbGuardrailEn,
  ...wikipediaEn,
  ...updateServiceEn,
  ...customAppEn,
  ...autoUpdateEn,
  ...contentUpdatesEn,
  ...tierEn,
  ...gpuEn,
  ...benchRunEn,
  ...countryPickerEn,
  ...continentEn,
  ...linkTileEn,
  ...pinsEn,
  ...durationEn,
  ...drugDisclaimerEn,
  ...drugIngestEn,
  ...drugEn,
  ...safetyEn,
  ...uploadEn,
  ...homeEn,
  ...easySetupEn,
  ...mapsPageEn,
  ...zimManagerEn,
  ...appsEn,
  ...mapsManagerEn,
  ...explorerEn,
  ...depotEn,
  ...servicesEn,
  ...chatEn,
  ...kbPolicyEn,
  ...nomadMdEn,
  ...visionEn,
  ...kbFilesEn,
  ...collectionsEn,
  ...advancedEn,
  ...supportEn,
  ...systemEn,
  ...legalEn,
  ...updateEn,
  ...modelsEn,
  ...benchEn,
  ...drugRefEn,
  ...drugShowEn,
  ...compareEn,
  ...conditionsEn,
  ...serverErrorEn,
  ...serverBenchmarkControllerEn,
  ...serverChatsControllerEn,
  ...serverConditionsControllerEn,
  ...serverCreatorPacksControllerEn,
  ...serverDrugReferenceControllerEn,
  ...serverMapsControllerEn,
  ...serverNomadMdControllerEn,
  ...serverOllamaControllerEn,
  ...serverRagControllerEn,
  ...serverSettingsControllerEn,
  ...serverSystemControllerEn,
  ...serverZimControllerEn,
  ...serverAppAutoUpdateServiceEn,
  ...serverAutoUpdateServiceEn,
  ...serverBenchmarkServiceEn,
  ...serverChatServiceEn,
  ...serverCollectionUpdateServiceEn,
  ...serverContentAutoUpdateServiceEn,
  ...serverCountriesServiceEn,
  ...serverDockerServiceEn,
  ...serverDownloadServiceEn,
  ...serverDrugReferenceServiceEn,
  ...serverMapServiceEn,
  ...serverOllamaServiceEn,
  ...serverRagServiceEn,
  ...serverSystemServiceEn,
  ...serverSystemUpdateServiceEn,
  ...serverZimExtractionServiceEn,
  ...serverZimServiceEn,
  ...serverDownloadDrugDataJobEn,
  ...serverDownloadModelJobEn,
  ...serverEmbedFileJobEn,
  ...serverIngestDrugDataJobEn,
  ...serverRunBenchmarkJobEn,
  ...serverRunDownloadJobEn,
  ...serverRunExtractPmtilesJobEn,
  ...serverBenchmarkStageEn,
  ...serverBenchmarkMsgEn,
  ...serverPreflightEn,
  ...serverCustomAppGuardEn,
  ...serverValidateEn,
  ...serverDockerEn,
  ...serverOllamaEn,
  ...serverBenchEn,
  ...serverZimEn,
  ...serverUpdateEn,
  ...serverAutoEn,
} as const

export type MessageKey = keyof typeof en
