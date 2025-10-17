
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth as useFirebaseAuth } from '@/firebase';
import {
    sendPasswordResetEmail,
    sendEmailVerification,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from 'firebase/auth';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useRouter } from 'next/navigation';


// --- Helper Functions & SVGs ---

const Eye = ({ ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOff = ({ ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

const UserIcon = ({ ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const LockIcon = ({ ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

// --- Main Application Component ---
export default function AuthApp({ initialView = 'login' }) {
    const [authView, setAuthView] = useState(initialView);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        setAuthView(initialView);
    }, [initialView]);

    const resetMessages = () => {
      setError('');
      setSuccessMessage('');
    }

    const renderAuthContent = () => {
      switch(authView) {
        case 'signup':
          return {
            title: 'Create Account',
            subtitle: 'Get started with a new account',
            content: <SignUpForm setError={setError} setSuccessMessage={setSuccessMessage} setAuthView={setAuthView} />,
            footer: (
              <button
                onClick={() => { setAuthView('login'); resetMessages(); }}
                className="text-accent hover:text-white transition-colors duration-300"
              >
                Already have an account? Login
              </button>
            )
          };
        case 'forgot':
          return {
            title: 'Forgot Password',
            subtitle: 'Enter your email to reset your password',
            content: <ForgotPasswordForm setError={setError} setSuccessMessage={setSuccessMessage} />,
            footer: (
              <button
                onClick={() => { setAuthView('login'); resetMessages(); }}
                className="text-accent hover:text-white transition-colors duration-300"
              >
                Back to Login
              </button>
            )
          };
        case 'login':
        default:
          return {
            title: 'Welcome Back',
            subtitle: 'Sign in to continue',
            content: <LoginForm setError={setError} onForgotPasswordClick={() => { setAuthView('forgot'); resetMessages(); }} />,
            footer: (
              <button
                onClick={() => { setAuthView('signup'); resetMessages(); }}
                className="text-accent hover:text-white transition-colors duration-300"
              >
                Don't have an account? Sign Up
              </button>
            )
          };
      }
    };

    const { title, subtitle, content, footer } = renderAuthContent();

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent font-sans p-4">
            <div className="w-full max-w-md">
                <div className="relative bg-background/50 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg transition-all duration-300">
                    <div className="p-8">
                        <h2 className="text-3xl font-bold text-white text-center mb-2 font-headline">
                            {title}
                        </h2>
                        <p className="text-muted-foreground text-center mb-8">
                            {subtitle}
                        </p>

                        {error && <ErrorMessage message={error} />}
                        {successMessage && <SuccessMessage message={successMessage} />}

                        {content}

                        <div className="text-center mt-6">
                            {footer}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Form Components ---

const LoginForm = ({ setError, onForgotPasswordClick }) => {
    const auth = useFirebaseAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleAuthError = (err) => {
        let message = 'An unexpected error occurred.';
        switch (err.code) {
            case 'auth/invalid-credential':
                message = 'Invalid credentials. Please check your email and password.';
                break;
            case 'auth/user-not-found':
                message = 'No account found with that email address.';
                break;
            case 'auth/wrong-password':
                message = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                message = 'Please enter a valid email address.';
                break;
            case 'auth/too-many-requests':
                message = 'Access temporarily disabled due to too many failed login attempts. Please reset your password or try again later.';
                break;
            default:
                message = err.code ? err.code.replace('auth/', '').replace(/-/g, ' ') : message;
                break;
        }
        setError(message);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password || !auth) {
            setError('Please fill in all fields.');
            return;
        }
        setIsLoading(true);
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // AuthContext will handle redirection
        } catch (err) {
            handleAuthError(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <InputField
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                icon={<UserIcon className="w-5 h-5 text-gray-400" />}
                autoComplete="email"
            />
            <InputField
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                icon={<LockIcon className="w-5 h-5 text-gray-400" />}
                actionIcon={
                    showPassword ? 
                    <EyeOff className="w-5 h-5 text-gray-400 hover:text-white" /> : 
                    <Eye className="w-5 h-5 text-gray-400 hover:text-white" />
                }
                onActionClick={() => setShowPassword(!showPassword)}
                autoComplete="current-password"
            />
             <div className="text-right">
                <button
                    type="button"
                    onClick={onForgotPasswordClick}
                    className="text-sm text-accent hover:text-white transition-colors duration-300"
                >
                    Forgot Password?
                </button>
            </div>
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
                {isLoading ? <LoadingSpinner size="small" /> : 'Login'}
            </button>
        </form>
    );
};

const SignUpForm = ({ setError, setSuccessMessage, setAuthView }) => {
    const auth = useFirebaseAuth();
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState('student');
    const [isLoading, setIsLoading] = useState(false);

    const handleAuthError = (err) => {
        let message = 'An unexpected error occurred. Please try again.';
        
        if (err.code) {
            switch (err.code) {
                case 'auth/email-already-in-use':
                    message = 'This email is already associated with an account.';
                    break;
                case 'auth/weak-password':
                    message = 'Password should be at least 6 characters long.';
                    break;
                case 'auth/invalid-email':
                    message = 'Please enter a valid email address.';
                    break;
            }
        }
        
        if (err.details && err.details.message) {
            message = err.details.message;
        } else if (err.code && err.code.startsWith('functions/')) {
            message = 'A server error occurred during signup. Please try again later.';
        }

        setError(message);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!auth) {
            setError("Auth service not available. Please try again later.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (!email || !password || !username) {
            setError("Please fill in all required fields.");
            return;
        }
        
        setIsLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            const functions = getFunctions(auth.app);
            const setInitialUserRole = httpsCallable(functions, 'setInitialUserRole');
            await setInitialUserRole({ uid: user.uid, role: role, email: user.email, username: username });

            await sendEmailVerification(user);
            
            setSuccessMessage('Account created! A verification link has been sent to your email. You can now log in.');
            setTimeout(() => {
                setAuthView('login');
            }, 3000);
            
        } catch (err) {
            handleAuthError(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
             <div className="space-y-3">
                <Label className="text-base text-white">I am a:</Label>
                <RadioGroup
                    value={role}
                    onValueChange={setRole}
                    className="grid grid-cols-2 gap-4"
                >
                    <div>
                        <RadioGroupItem value="student" id="role-student" className="peer sr-only" />
                        <Label
                            htmlFor="role-student"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                            Student
                        </Label>
                    </div>
                     <div>
                        <RadioGroupItem value="institute" id="role-institute" className="peer sr-only" />
                        <Label
                            htmlFor="role-institute"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                            Institute
                        </Label>
                    </div>
                </RadioGroup>
             </div>
            <InputField
                id="signup-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                icon={<UserIcon className="w-5 h-5 text-gray-400" />}
                autoComplete="username"
            />
            <InputField
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                icon={<UserIcon className="w-5 h-5 text-gray-400" />}
                autoComplete="email"
            />
            <InputField
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                icon={<LockIcon className="w-5 h-5 text-gray-400" />}
                actionIcon={
                    showPassword ? 
                    <EyeOff className="w-5 h-5 text-gray-400 hover:text-white" /> : 
                    <Eye className="w-5 h-5 text-gray-400 hover:text-white" />
                }
                onActionClick={() => setShowPassword(!showPassword)}
                autoComplete="new-password"
            />
            <InputField
                id="signup-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                icon={<LockIcon className="w-5 h-5 text-gray-400" />}
                autoComplete="new-password"
            />

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
                {isLoading ? <LoadingSpinner size="small" /> : 'Sign Up'}
            </button>
        </form>
    );
};

const ForgotPasswordForm = ({ setError, setSuccessMessage }) => {
    const auth = useFirebaseAuth();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        if (!email || !auth) {
            setError('Please enter your email address.');
            return;
        }
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccessMessage('Password reset email sent! Check your inbox.');
        } catch (err) {
            const message = err.code ? err.code.replace('auth/', '').replace(/-/g, ' ') : 'An unexpected error occurred.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <InputField
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                icon={<UserIcon className="w-5 h-5 text-gray-400" />}
                autoComplete="email"
            />
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
                {isLoading ? <LoadingSpinner size="small" /> : 'Send Reset Email'}
            </button>
        </form>
    );
};


// --- UI Components ---

const InputField = ({ id, type, value, onChange, placeholder, icon, actionIcon, onActionClick, autoComplete }) => (
  <div className="relative">
    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
      {icon}
    </span>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-background/70 text-white placeholder-gray-400 border border-white/20 rounded-lg py-3 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300"
      required
      autoComplete={autoComplete}
    />
    {actionIcon && (
      <button type="button" onClick={onActionClick} className="absolute inset-y-0 right-0 flex items-center pr-3">
        {actionIcon}
      </button>
    )}
  </div>
);

const ErrorMessage = ({ message }) => (
  <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm text-center capitalize">
    {message}
  </div>
);

const SuccessMessage = ({ message }) => (
    <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg mb-6 text-sm text-center">
      {message}
    </div>
  );

const LoadingSpinner = ({ size = 'large' }) => (
  <div className={`animate-spin rounded-full border-t-2 border-b-2 border-primary-foreground ${size === 'large' ? 'w-12 h-12' : 'w-6 h-6'}`}></div>
);

    