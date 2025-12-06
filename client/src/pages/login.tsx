import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CircleHelp } from "lucide-react";

const loginSchema = z.object({
  email: z.string().min(1, "Please enter your email or phone number"),
  password: z.string().min(1, "Please enter your password"),
});

type LoginForm = z.infer<typeof loginSchema>;

const signupSchema = z.object({
  firstName: z.string().min(1, "What's your name?"),
  lastName: z.string().min(1, "What's your name?"),
  emailOrPhone: z.string().min(1, "You'll use this when you log in and if you ever need to reset your password."),
  newPassword: z.string().min(6, "Enter a combination of at least six numbers, letters and punctuation marks (like ! and &)."),
  birthday: z.object({
    month: z.string(),
    day: z.string(),
    year: z.string(),
  }),
  gender: z.string().optional(),
});

type SignupForm = z.infer<typeof signupSchema>;

const languages = [
  "English (UK)", "Euskara", "Français (France)", "Galego", "Hrvatski", "Italiano", 
  "Lietuvių", "Magyar", "Nederlands", "Norsk (bokmål)", "Polski", "Português (Brasil)", 
  "Português (Portugal)", "Română", "Slovenčina", "Slovenščina", "Srpski", "Suomi", 
  "Svenska", "Tiếng Việt", "Türkçe", "Ελληνικά", "Български", "Русский", "Українська",
  "עברית", "العربية", "فارسی", "हिन्दी", "ภาษาไทย", "中文(简体)", "中文(香港)", 
  "中文(台灣)", "日本語", "한국어"
];

const footerLinks = [
  "Sign Up", "Log in", "Messenger", "Facebook Lite", "Video", "Places", "Games", 
  "Marketplace", "Meta Pay", "Meta Store", "Meta Quest", "Ray-Ban Meta", "Meta AI", 
  "Instagram", "Threads", "Fundraisers", "Services", "Voting Information Centre", 
  "Privacy Policy", "Privacy Centre", "Groups", "About", "Create ad", "Create Page", 
  "Developers", "Careers", "Cookies", "AdChoices", "Terms", "Help", "Contact uploading and non-users"
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 120 }, (_, i) => String(currentYear - i));

export default function LoginPage() {
  const [signupOpen, setSignupOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      emailOrPhone: "",
      newPassword: "",
      birthday: {
        month: String(new Date().getMonth()),
        day: String(new Date().getDate()),
        year: String(new Date().getFullYear() - 25),
      },
      gender: "",
    },
  });

  const handleLogin = async (data: LoginForm) => {
    setIsLoggingIn(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Login attempt:", data);
    setIsLoggingIn(false);
  };

  const handleSignup = async (data: SignupForm) => {
    setIsSigningUp(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Signup attempt:", data);
    setIsSigningUp(false);
    setSignupOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src="/favicon.png" 
              alt="Logo" 
              className="w-12 h-12 mx-auto mb-4"
              data-testid="img-logo"
            />
            <h1 
              className="text-3xl font-bold mb-2"
              style={{ color: '#1c1e21' }}
              data-testid="text-title"
            >
              Welcome Back
            </h1>
            <p 
              className="text-gray-600"
              data-testid="text-subtitle"
            >
              Sign in to your account to continue
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <input
                          {...field}
                          type="text"
                          placeholder="Email or username"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                          style={{ color: '#1c1e21' }}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage className="text-sm" style={{ color: '#dc2626' }} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <input
                          {...field}
                          type="password"
                          placeholder="Password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                          style={{ color: '#1c1e21' }}
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage className="text-sm" style={{ color: '#dc2626' }} />
                    </FormItem>
                  )}
                />

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-70"
                  data-testid="button-login"
                >
                  {isLoggingIn ? "Signing in..." : "Sign in"}
                </button>
              </form>
            </Form>

            <div className="mt-4 text-center">
              <a
                href="#"
                className="text-sm text-blue-600 hover:underline"
                data-testid="link-forgotten-password"
              >
                Forgot password?
              </a>
            </div>

            <div className="my-4 border-t border-gray-200" />

            <button
              onClick={() => setSignupOpen(true)}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
              data-testid="button-create-account"
            >
              Create new account
            </button>
          </div>
        </div>
      </main>

      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent className="sm:max-w-[400px] p-6 gap-0 bg-white rounded-lg">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold" style={{ color: '#1c1e21' }}>Create Account</DialogTitle>
            <DialogDescription className="text-sm mt-1" style={{ color: '#606770' }}>
              Join us today
            </DialogDescription>
          </DialogHeader>

          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-3">
              <div className="flex gap-3">
                <FormField
                  control={signupForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <input
                          {...field}
                          placeholder="First name"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                          style={{ color: '#1c1e21' }}
                          data-testid="input-firstname"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" style={{ color: '#dc2626' }} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <input
                          {...field}
                          placeholder="Last name"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                          style={{ color: '#1c1e21' }}
                          data-testid="input-lastname"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" style={{ color: '#dc2626' }} />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={signupForm.control}
                name="emailOrPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input
                        {...field}
                        placeholder="Email or phone"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        style={{ color: '#1c1e21' }}
                        data-testid="input-signup-email"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" style={{ color: '#dc2626' }} />
                  </FormItem>
                )}
              />

              <FormField
                control={signupForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input
                        {...field}
                        type="password"
                        placeholder="Password"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        style={{ color: '#1c1e21' }}
                        data-testid="input-signup-password"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" style={{ color: '#dc2626' }} />
                  </FormItem>
                )}
              />

              <div>
                <label className="text-xs text-gray-700 block mb-1">Date of birth</label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    style={{ color: '#1c1e21' }}
                    value={signupForm.watch("birthday.month")}
                    onChange={(e) => signupForm.setValue("birthday.month", e.target.value)}
                    data-testid="select-birthday-month"
                  >
                    {months.map((m, idx) => (
                      <option key={idx} value={String(idx)}>{m}</option>
                    ))}
                  </select>
                  <select
                    className="flex-1 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    style={{ color: '#1c1e21' }}
                    value={signupForm.watch("birthday.day")}
                    onChange={(e) => signupForm.setValue("birthday.day", e.target.value)}
                    data-testid="select-birthday-day"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    className="flex-1 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    style={{ color: '#1c1e21' }}
                    value={signupForm.watch("birthday.year")}
                    onChange={(e) => signupForm.setValue("birthday.year", e.target.value)}
                    data-testid="select-birthday-year"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-700 block mb-1">Gender</label>
                <div className="flex gap-2">
                  {[
                    { value: "female", label: "Female" },
                    { value: "male", label: "Male" },
                    { value: "custom", label: "Custom" },
                  ].map((option) => (
                    <label key={option.value} className="flex-1 flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value={option.value}
                        onChange={(e) => signupForm.setValue("gender", e.target.value)}
                        checked={signupForm.watch("gender") === option.value}
                        className="w-4 h-4"
                        data-testid={`radio-gender-${option.value}`}
                      />
                      <span className="text-sm" style={{ color: '#1c1e21' }}>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSigningUp}
                className="w-full py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-70"
                data-testid="button-signup-submit"
              >
                {isSigningUp ? "Creating..." : "Sign Up"}
              </button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
