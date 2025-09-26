import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function LoginSignup() {
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({ role: 'patient' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (isLogin) {
        const { data } = await api.post('/auth/login', { email: form.email, password: form.password })
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        const role = data.user.role
        navigate(role === 'patient' ? '/patient' : role === 'doctor' ? '/doctor' : '/pharmacy')
      } else {
        await api.post('/auth/register', {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          age: form.age,
          village: form.village,
          specialization: form.specialization,
          qualification: form.qualification,
          availability: form.availability
        })
        setIsLogin(true)
      }
    } catch (e) { setError(e.response?.data?.message || 'Error') }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="container-app py-10">
      <div className="max-w-md mx-auto card">
        <div className="card-body">
          <div className="flex justify-between mb-4">
            <button className={`btn ${isLogin ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIsLogin(true)}>Login</button>
            <button className={`btn ${!isLogin ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIsLogin(false)}>Sign Up</button>
          </div>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <form className="space-y-2" onSubmit={submit}>
            {!isLogin && (
              <>
                <input className="input" placeholder="Name" onChange={set('name')} />
                <select className="input" value={form.role} onChange={set('role')}>
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="hospital">Hospital</option>
                </select>
                {form.role === 'patient' && (
                  <>
                    <input className="input" placeholder="Age" onChange={set('age')} />
                    <input className="input" placeholder="Village" onChange={set('village')} />
                  </>
                )}
                {form.role === 'doctor' && (
                  <>
                    <input className="input" placeholder="Specialization" onChange={set('specialization')} />
                    <input className="input" placeholder="Qualification" onChange={set('qualification')} />
                    <input className="input" placeholder="Availability" onChange={set('availability')} />
                  </>
                )}
              </>
            )}
            <input className="input" placeholder="Email" onChange={set('email')} />
            <input className="input" placeholder="Password" type="password" onChange={set('password')} />
            <button className="w-full btn-primary">{isLogin ? 'Login' : 'Create Account'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}


