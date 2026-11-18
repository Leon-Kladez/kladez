import api from "~/lib/api"
import { CheckLatestVersionResult } from "../../types/system"
import { useQuery } from "@tanstack/react-query"


export const useUpdateAvailable = () => {
    const queryData = useQuery<CheckLatestVersionResult | undefined>({
        queryKey: ['system-update-available'],
        queryFn: () => api.checkLatestVersion(),
        // «Кладезъ»: главная открыта долго — раз в полчаса спросить у панели (ответ из кэша, быстро).
        refetchInterval: 30 * 60 * 1000,
        refetchOnWindowFocus: true,
    })

    return queryData.data
}