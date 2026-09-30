import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

interface OAuthClientInfo {
  displayName: string
  tokenName: string
  redirectUri: string
}

const oauthClients: Record<string, OAuthClientInfo> = {
  'claude-desktop-app': {
    displayName: 'Claude Desktop App',
    tokenName: 'Claude-Code',
    redirectUri: 'http://127.0.0.1:30080/api/aigotoken/callback',
  },
  deepchat: {
    displayName: 'DeepChat',
    tokenName: 'DeepChat',
    redirectUri: 'http://localhost:1456/oauth/aigotoken/callback',
  },
}

const defaultTokenName = 'API Token'

export const Route = createFileRoute('/oauth/authorize')({
  component: OAuthAuthorizePage,
})

function OAuthAuthorizePage() {
  const { t } = useTranslation()
  const search = useSearch({ strict: false }) as Record<string, string>
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.auth.user)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  const clientId = search.client_id
  const redirectUri = search.redirect_uri
  const codeChallenge = search.code_challenge
  const codeChallengeMethod = search.code_challenge_method
  const state = search.state

  const clientInfo = useMemo<OAuthClientInfo>(() => {
    if (clientId && oauthClients[clientId]) return oauthClients[clientId]
    return {
      displayName: t('Unknown application'),
      tokenName: defaultTokenName,
      redirectUri: '',
    }
  }, [clientId, t])

  useEffect(() => {
    if (user) return
    const params = new URLSearchParams(window.location.search)
    const returnTo = `${window.location.pathname}?${params.toString()}`
    navigate({ to: '/sign-in', search: { redirect: returnTo } })
  }, [user, navigate])

  const handleApprove = async () => {
    setStatus('loading')
    setError('')
    try {
      const res = await api.post('/api/oauth/authorize', {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
        state,
      })
      const data = res.data?.data
      if (!data?.code) {
        setStatus('error')
        setError(res.data?.message || t('Authorization failed'))
        return
      }
      const code = encodeURIComponent(data.code)
      const respState = encodeURIComponent(data.state || '')
      window.location.href = `${data.redirect_uri}?code=${code}&state=${respState}`
    } catch (e: unknown) {
      setStatus('error')
      const responseMessage = (
        e as { response?: { data?: { message?: string } } }
      ).response?.data?.message
      setError(
        responseMessage ||
          (e instanceof Error ? e.message : '') ||
          t('Authorization failed')
      )
    }
  }

  if (!user) {
    return (
      <PublicLayout showMainContainer={false}>
        <div className='flex min-h-svh items-center justify-center px-4 pt-24 pb-12'>
          <p className='text-muted-foreground text-sm'>
            {t('Redirecting to sign in…')}
          </p>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout showMainContainer={false}>
      <div className='from-primary/10 via-background to-background flex min-h-svh flex-col bg-linear-to-b px-4 pt-24 pb-12'>
        <div className='mx-auto flex w-full max-w-md flex-1 items-center'>
          <Card className='ring-primary/15 shadow-primary/5 w-full gap-0 p-6 shadow-lg'>
            <div className='flex items-center gap-3'>
              <div className='bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl'>
                <svg
                  width='22'
                  height='22'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <rect x='2' y='2' width='20' height='8' rx='2' />
                  <rect x='2' y='14' width='20' height='8' rx='2' />
                  <circle cx='6' cy='6' r='1' fill='currentColor' />
                  <circle cx='6' cy='18' r='1' fill='currentColor' />
                </svg>
              </div>
              <div className='min-w-0'>
                <h1 className='text-foreground truncate text-lg font-semibold'>
                  {clientInfo.displayName}
                </h1>
                <p className='text-muted-foreground text-xs'>
                  {t('Requests access to your account')}
                </p>
              </div>
            </div>

            {error && (
              <div className='bg-destructive/10 text-destructive mt-4 rounded-lg px-3 py-2 text-sm'>
                {error}
              </div>
            )}

            <div className='mt-6'>
              <Button
                type='button'
                size='lg'
                className='h-11 w-full'
                onClick={handleApprove}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? t('Authorizing…') : t('Allow sign in')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </PublicLayout>
  )
}
