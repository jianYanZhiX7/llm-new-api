/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import {
  useAnnouncements,
  useApiInfo,
  useDashboardContentVisibility,
  useFAQ,
} from './use-status-data'
import { useUptimeStatus } from './use-uptime-status'

export function useOverviewPanelVisibility() {
  const visibility = useDashboardContentVisibility()
  const { items: apiInfoItems } = useApiInfo()
  const { items: announcements } = useAnnouncements()
  const { items: faq } = useFAQ()
  const { groups: uptimeGroups } = useUptimeStatus(visibility.uptimeKuma)

  return {
    apiInfo: visibility.apiInfo && apiInfoItems.length > 0,
    announcements: visibility.announcements && announcements.length > 0,
    faq: visibility.faq && faq.length > 0,
    uptimeKuma: visibility.uptimeKuma && uptimeGroups.length > 0,
  }
}
