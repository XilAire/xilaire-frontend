'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { toast } from 'react-hot-toast'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    console.log(
      'Signing up with:',
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10) + '…'
    )

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Check your inbox for a confirmation link!')
      router.push('/login')
    }
  }

  return (
    <div className="max-w-md mx-auto p-8 space-y-4 bg-white dark:bg-gray-800 rounded shadow">
      <h1 className="text-2xl font-bold text-center">Create an Account</h1>
      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            required
            className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 dark:text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            required
            className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 dark:text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition"
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <p className="text-sm text-center">
        Already have an account?{' '}
        <a href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
          Sign in
        </a>
      </p>
    </div>
  )
}
