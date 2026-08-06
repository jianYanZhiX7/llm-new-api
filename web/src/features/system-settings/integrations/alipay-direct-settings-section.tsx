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
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import * as z from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { SettingsSwitchField } from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { useUpdateOption } from '../hooks/use-update-option'

// 支付宝直连支付设置值。
// 可编辑字段与后端 model/option.go 注册的 option key 完全一致。
// PrivateKey / AppCert / PublicCert / RootCert 从 cert/alipay/ 文件加载，
// 不通过 option 系统管理，仅作为只读状态展示。
export interface AlipayDirectSettingsValues {
  AlipayDirectEnabled: boolean
  AlipayDirectSandbox: boolean
  AlipayDirectAppId: string
  AlipayDirectNotifyURL: string
  AlipayDirectReturnURL: string
  AlipayDirectSellerId: string
  AlipayDirectUnitPrice: number
  AlipayDirectMinTopUp: number
  // 只读：文件加载状态
  AlipayDirectPrivateKey: string
  AlipayDirectAppCert: string
  AlipayDirectPublicCert: string
  AlipayDirectRootCert: string
}

// 可通过 option API 保存的字段（排除文件加载字段）。
const ALIPAY_DIRECT_FIELD_KEYS = [
  'AlipayDirectEnabled',
  'AlipayDirectSandbox',
  'AlipayDirectAppId',
  'AlipayDirectNotifyURL',
  'AlipayDirectReturnURL',
  'AlipayDirectSellerId',
  'AlipayDirectUnitPrice',
  'AlipayDirectMinTopUp',
] as const satisfies ReadonlyArray<keyof AlipayDirectSettingsValues>

type AlipayDirectFieldKey = (typeof ALIPAY_DIRECT_FIELD_KEYS)[number]

interface Props {
  defaultValues: AlipayDirectSettingsValues
}

// 自包含 schema：只校验可编辑字段，文件加载字段不在 option 系统中。
const alipayDirectSchema = z.object({
  AlipayDirectEnabled: z.boolean(),
  AlipayDirectSandbox: z.boolean(),
  AlipayDirectAppId: z.string(),
  AlipayDirectNotifyURL: z.string(),
  AlipayDirectReturnURL: z.string(),
  AlipayDirectSellerId: z.string(),
  AlipayDirectUnitPrice: z.coerce.number().min(0),
  AlipayDirectMinTopUp: z.coerce.number().min(1),
  // 只读字段：不参与校验，仅用于展示文件加载状态
  AlipayDirectPrivateKey: z.string().optional(),
  AlipayDirectAppCert: z.string().optional(),
  AlipayDirectPublicCert: z.string().optional(),
  AlipayDirectRootCert: z.string().optional(),
})

type AlipayDirectFormValues = z.infer<typeof alipayDirectSchema>

function sanitize(value: AlipayDirectFormValues): AlipayDirectFormValues {
  return {
    ...value,
    AlipayDirectAppId: value.AlipayDirectAppId.trim(),
    AlipayDirectNotifyURL: value.AlipayDirectNotifyURL.trim(),
    AlipayDirectReturnURL: value.AlipayDirectReturnURL.trim(),
    AlipayDirectSellerId: value.AlipayDirectSellerId.trim(),
  }
}

/**
 * 支付宝直连（电脑网站支付 - 证书模式）独立设置面板。
 *
 * 设计原则：关注点分离
 * - 拥有独立的 useForm + Zod schema，不依赖父级 PaymentSettingsSection 的 form
 * - 拥有独立的 useUpdateOption mutation，通过自身的"Save Alipay Direct settings"按钮触发
 * - 不修改父级 schema，不参与父级"Save all settings"批量提交
 * - 父级只负责把这个组件放进对应的 TabsContent
 */
export function AlipayDirectSettingsSection({ defaultValues }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const updateOption = useUpdateOption()

  const form = useForm<AlipayDirectFormValues>({
    resolver: zodResolver(alipayDirectSchema) as Resolver<AlipayDirectFormValues>,
    mode: 'onChange',
    defaultValues,
  })

  // 跟踪初始值用于 diff：只在 defaultValues 真正变化时重置（例如保存后 server 返回新值）
  const initialRef = useRef(defaultValues)
  const signature = JSON.stringify(defaultValues)
  useEffect(() => {
    initialRef.current = defaultValues
    form.reset(defaultValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const { isSubmitting } = form.formState
  const current = form.watch()

  const onSubmit = form.handleSubmit(async (values) => {
    const sanitized = sanitize(values)
    const initial = sanitize(initialRef.current)

    const updates: Array<{ key: AlipayDirectFieldKey; value: string | number | boolean }> = []
    for (const key of ALIPAY_DIRECT_FIELD_KEYS) {
      if (sanitized[key] !== initial[key]) {
        updates.push({ key, value: sanitized[key] })
      }
    }

    if (updates.length === 0) {
      toast.info(t('No changes to save'))
      return
    }

    // 串行保存：每条 option key 一次 API 调用，失败即中止，保留剩余未保存项。
    // useUpdateOption 内部已 invalidate system-options 缓存，前端会自动刷新。
    for (const { key, value } of updates) {
      await new Promise<void>((resolve, reject) => {
        const subscription = updateOption.mutateAsync(
          { key, value: String(value) },
          {
            onSuccess: (data) => {
              if (data.success) {
                resolve()
              } else {
                reject(new Error(data.message || t('Failed to update setting')))
              }
            },
            onError: (err: Error) => reject(err),
          }
        )
        // tsc safety: mutateAsync returns the result; subscription not needed
        void subscription
      }).catch((err: Error) => {
        toast.error(`${t('Save Alipay Direct settings failed')}: ${err.message}`)
        throw err
      })
    }

    // 全部成功后刷新缓存（保险），并更新 initialRef
    queryClient.invalidateQueries({ queryKey: ['system-options'] })
    initialRef.current = { ...initialRef.current, ...sanitized }
    form.reset(sanitized)
    toast.success(t('Alipay Direct settings saved'))
  })

  const pending = updateOption.isPending || isSubmitting

  return (
    <form
      onSubmit={onSubmit}
      className='space-y-4 pt-4'
      data-no-autosubmit='true'
    >
      <div>
        <h3 className='text-lg font-medium'>
          {t('Alipay Direct (PC Website Pay)')}
        </h3>
        <p className='text-muted-foreground text-sm'>
          {t(
            'Direct integration with Alipay Open Platform (alipay.trade.page.pay) using certificate mode. Does not go through Epay or any aggregator.'
          )}
        </p>
      </div>

      <Alert>
        <AlertDescription className='text-xs'>
          {t(
            'Private key and certificates are loaded from cert/alipay/ files on the server. Use deploy.sh to upload these files. AppId and SellerId can be configured below.'
          )}
        </AlertDescription>
      </Alert>

      <SettingsPageFormActions
        onSave={onSubmit}
        isSaving={pending}
        saveLabel={t('Save Alipay Direct settings')}
      />

      <div className='grid gap-4 sm:grid-cols-2'>
        <SettingsSwitchField
          checked={current.AlipayDirectEnabled}
          onCheckedChange={(v) =>
            form.setValue('AlipayDirectEnabled', v, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          label={t('Enable Alipay Direct')}
          className='py-0'
        />
        <SettingsSwitchField
          checked={current.AlipayDirectSandbox}
          onCheckedChange={(v) =>
            form.setValue('AlipayDirectSandbox', v, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          label={t('Sandbox mode')}
          className='py-0'
        />
      </div>

      <div className='grid gap-1.5'>
        <Label>{t('App ID')}</Label>
        <Input
          value={current.AlipayDirectAppId}
          onChange={(e) =>
            form.setValue('AlipayDirectAppId', e.target.value, {
              shouldDirty: true,
            })
          }
          placeholder='2021000xxxxxxxxx'
        />
      </div>

      <div className='grid grid-cols-1 gap-4'>
        <div className='grid gap-1.5'>
          <Label>{t('Application Private Key (PEM)')}</Label>
          <div className='flex items-center gap-2'>
            {current.AlipayDirectPrivateKey ? (
              <Badge className='bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'>
                {t('Loaded from cert/alipay/app_private_key.pem')}
              </Badge>
            ) : (
              <Badge variant='destructive'>
                {t('Not found in cert/alipay/app_private_key.pem')}
              </Badge>
            )}
          </div>
          <p className='text-muted-foreground text-xs'>
            {t(
              'Place your RSA private key at cert/alipay/app_private_key.pem on the server. Upload via deploy.sh.'
            )}
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='grid gap-1.5'>
          <Label>{t('Application Certificate')}</Label>
          {current.AlipayDirectAppCert ? (
            <Badge className='bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'>
              {t('Loaded')}
            </Badge>
          ) : (
            <Badge variant='destructive'>{t('Not found')}</Badge>
          )}
          <p className='text-muted-foreground text-xs'>
            cert/alipay/app_cert_public_key.crt
          </p>
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Alipay Public Certificate')}</Label>
          {current.AlipayDirectPublicCert ? (
            <Badge className='bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'>
              {t('Loaded')}
            </Badge>
          ) : (
            <Badge variant='destructive'>{t('Not found')}</Badge>
          )}
          <p className='text-muted-foreground text-xs'>
            cert/alipay/alipay_cert_public_key.crt
          </p>
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Alipay Root Certificate')}</Label>
          {current.AlipayDirectRootCert ? (
            <Badge className='bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'>
              {t('Loaded')}
            </Badge>
          ) : (
            <Badge variant='destructive'>{t('Not found')}</Badge>
          )}
          <p className='text-muted-foreground text-xs'>
            cert/alipay/alipay_root_cert.crt
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Seller ID (PID)')}</Label>
          <Input
            value={current.AlipayDirectSellerId}
            onChange={(e) =>
              form.setValue('AlipayDirectSellerId', e.target.value, {
                shouldDirty: true,
              })
            }
            placeholder='2088xxxxxxxxxxxx'
          />
          <p className='text-muted-foreground text-xs'>
            {t('Optional. Leave empty to use the default seller account bound to the app.')}
          </p>
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Unit price (CNY / unit)')}</Label>
          <Input
            type='number'
            step={0.1}
            min={0}
            value={current.AlipayDirectUnitPrice}
            onChange={(e) =>
              form.setValue(
                'AlipayDirectUnitPrice',
                e.target.value === '' ? 0 : e.target.valueAsNumber,
                { shouldDirty: true }
              )
            }
          />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Minimum top-up quantity')}</Label>
          <Input
            type='number'
            min={1}
            value={current.AlipayDirectMinTopUp}
            onChange={(e) =>
              form.setValue(
                'AlipayDirectMinTopUp',
                e.target.value === '' ? 1 : e.target.valueAsNumber,
                { shouldDirty: true }
              )
            }
          />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Async notification URL (notify_url)')}</Label>
          <Input
            placeholder='<ServerAddress>/api/alipay/webhook'
            value={current.AlipayDirectNotifyURL}
            onChange={(e) =>
              form.setValue('AlipayDirectNotifyURL', e.target.value, {
                shouldDirty: true,
              })
            }
          />
          <p className='text-muted-foreground text-xs'>
            {t('Leave empty to use <ServerAddress>/api/alipay/webhook automatically.')}
          </p>
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Sync return URL (return_url)')}</Label>
          <Input
            placeholder='<ServerAddress>/usage-logs'
            value={current.AlipayDirectReturnURL}
            onChange={(e) =>
              form.setValue('AlipayDirectReturnURL', e.target.value, {
                shouldDirty: true,
              })
            }
          />
          <p className='text-muted-foreground text-xs'>
            {t('Leave empty to use <ServerAddress>/usage-logs automatically.')}
          </p>
        </div>
      </div>

      <SettingsPageFormActions
        onSave={onSubmit}
        isSaving={pending}
        saveLabel={t('Save Alipay Direct settings')}
      />

      {pending ? (
        <p className='text-muted-foreground flex items-center gap-2 text-xs'>
          <Loader2 className='h-3 w-3 animate-spin' />
          {t('Saving...')}
        </p>
      ) : null}
    </form>
  )
}
