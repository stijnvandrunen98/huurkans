import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .limit(1)

        if (error || !data || data.length === 0) return null
        const user = data[0]
        const ok = await bcrypt.compare(credentials.password, user.password_hash)
        if (!ok) return null
        return { id: user.id, email: user.email }
      }
    })
  ],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET
})
