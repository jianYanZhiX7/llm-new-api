import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState } from 'react'
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
    return { displayName: t('Unknown application'), tokenName: defaultTokenName, redirectUri: '' }
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
      const responseMessage = (e as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(responseMessage || (e instanceof Error ? e.message : '') || t('Authorization failed'))
    }
  }

  const handleCancel = () => {
    const expectedUri = oauthClients[clientId ?? '']?.redirectUri
    if (expectedUri && redirectUri === expectedUri) {
      const cb = new URL(expectedUri)
      cb.searchParams.set('error', 'access_denied')
      if (state) cb.searchParams.set('state', state)
      window.location.href = cb.toString()
      return
    }
    navigate({ to: '/' })
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <p className="text-sm text-gray-500 dark:text-zinc-400">{t('Redirecting to sign in…')}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" />
              <circle cx="6" cy="6" r="1" fill="#D97757" />
              <circle cx="6" cy="18" r="1" fill="#D97757" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{clientInfo.displayName}</h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400">{t('Requests access to your account')}</p>
          </div>
        </div>

        <div className="mb-6 space-y-2 text-sm text-gray-600 dark:text-zinc-300">
          <p>
            <Trans
              i18nKey="<strong>{{user}}</strong>, {{client}} wants to create an API token named <code>{{tokenName}}</code> to access the model API."
              components={{
                strong: <strong className="font-medium text-gray-900 dark:text-zinc-100" />,
                code: <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-zinc-800" />,
              }}
              values={{
                user: user.display_name || user.username,
                client: clientInfo.displayName,
                tokenName: clientInfo.tokenName,
              }}
            />
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-gray-500 dark:text-zinc-400">
            <li>{t('Unlimited quota, never expires, all models')}</li>
            <li>{t('Reuses an existing token with the same name')}</li>
            <li>{t('Revoke anytime from the token management page')}</li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={status === 'loading'}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t('Decline')}
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={status === 'loading'}
            className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
          >
            {status === 'loading' ? t('Authorizing…') : t('Allow')}
          </button>
        </div>
      </div>
    </div>
  )
}
