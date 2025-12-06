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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f0f2f5' }}>
      <main className="flex-1 flex items-center justify-center px-4 py-4 md:py-0">
        <div className="w-full max-w-[980px] flex flex-col lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="lg:flex-1 lg:max-w-[580px] text-center lg:text-left mb-4 lg:mb-0 lg:pt-0 pt-2 lg:pr-8">
            <div className="flex justify-center lg:justify-start">
              <svg viewBox="0 0 267 89" fill="none" className="h-16 md:h-[106px] lg:-ml-7 w-auto">
                <path d="M52.7 88.9c-25.3 0-45.9-20.6-45.9-45.9S27.4-2.9 52.7-2.9 98.6 17.7 98.6 43s-20.6 45.9-45.9 45.9zm0-81.8c-19.8 0-35.9 16.1-35.9 35.9s16.1 35.9 35.9 35.9 35.9-16.1 35.9-35.9S72.5 7.1 52.7 7.1z" fill="#0866FF"/>
                <path d="M58.5 58.1H47.1V43.4h-5.3v-9.3h5.3v-5.9c0-7.4 3.1-11.8 11.8-11.8h7.2v9.3h-4.5c-3.4 0-3.6 1.3-3.6 3.6l0 4.8h8.2l-1 9.3h-7.2v14.7h0z" fill="#0866FF"/>
                <path d="M79.1 62.7c-4.5 0-8-1.4-10.4-4.2l5-7.2c1.5 1.8 3.3 2.7 5.5 2.7 1.7 0 2.6-.6 2.6-1.6 0-1.2-1-1.6-4.6-2.7-5.7-1.7-8.5-4.2-8.5-9.6 0-5.9 4.3-10.1 11.4-10.1 4.1 0 7.5 1.4 9.8 4l-4.8 7c-1.5-1.6-3.1-2.4-5.1-2.4-1.4 0-2.2.6-2.2 1.5 0 1.1.9 1.5 4.4 2.5 5.8 1.7 8.8 4.1 8.8 9.7 0 6.3-4.6 10.4-11.9 10.4zM118.2 62.1v-2.3c-2.1 2.2-4.8 3-8 3-7.3 0-12.6-5.7-12.6-13.5s5.3-13.5 12.6-13.5c3.2 0 5.9.8 8 3v-8.2h8.8v31.5h-8.8zm-5.4-18.5c-3.3 0-5.9 2.3-5.9 5.8s2.6 5.8 5.9 5.8c3.3 0 5.9-2.3 5.9-5.8s-2.6-5.8-5.9-5.8zM155.3 52.9c-1.6 6.1-6.5 9.8-13.5 9.8-8.2 0-14.1-5.5-14.1-13.5 0-7.7 5.9-13.5 14.1-13.5 7.7 0 13.1 5.3 13.1 13.1 0 1.1-.1 2.1-.3 3h-18c.7 2.7 2.7 4 5.5 4 2.2 0 3.8-.8 4.7-2.4l8.5-.5zm-8.4-7.2c-.5-2.5-2.4-4-5.1-4-2.6 0-4.5 1.5-5.1 4h10.2zM173.8 62.7c-7.7 0-12.6-4.5-12.6-12.6V30.6h8.8v18.5c0 3.5 1.5 5.3 4.7 5.3 3.1 0 5.1-1.8 5.1-5.4V30.6h8.8v31.5h-8.8v-2.5c-1.8 2-4.3 3.1-6 3.1zM214.2 62.1v-2.3c-2.1 2.2-4.8 3-8 3-7.3 0-12.6-5.7-12.6-13.5s5.3-13.5 12.6-13.5c3.2 0 5.9.8 8 3v-8.2h8.8v31.5h-8.8zm-5.4-18.5c-3.3 0-5.9 2.3-5.9 5.8s2.6 5.8 5.9 5.8c3.3 0 5.9-2.3 5.9-5.8s-2.6-5.8-5.9-5.8zM237.7 62.7c-4.5 0-8-1.4-10.4-4.2l5-7.2c1.5 1.8 3.3 2.7 5.5 2.7 1.7 0 2.6-.6 2.6-1.6 0-1.2-1-1.6-4.6-2.7-5.7-1.7-8.5-4.2-8.5-9.6 0-5.9 4.3-10.1 11.4-10.1 4.1 0 7.5 1.4 9.8 4l-4.8 7c-1.5-1.6-3.1-2.4-5.1-2.4-1.4 0-2.2.6-2.2 1.5 0 1.1.9 1.5 4.4 2.5 5.8 1.7 8.8 4.1 8.8 9.7 0 6.3-4.6 10.4-11.9 10.4z" fill="#0866FF"/>
              </svg>
            </div>
            <h2 
              className="text-[18px] md:text-[28px] leading-6 md:leading-8 font-normal mt-2 lg:pl-1"
              style={{ color: '#1c1e21' }}
              data-testid="text-tagline"
            >
              Facebook helps you connect and share with the people in your life.
            </h2>
          </div>

          <div className="w-full max-w-[396px] mx-auto lg:mx-0">
            <div 
              className="bg-card rounded-lg p-4 pb-6"
              style={{ boxShadow: '0 2px 4px rgba(0,0,0,.1), 0 8px 16px rgba(0,0,0,.1)' }}
              data-testid="card-login"
            >
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-3">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <input
                            {...field}
                            type="text"
                            placeholder="Email address or phone number"
                            className="w-full h-[52px] text-[17px] px-4 border rounded-md bg-white focus:outline-none focus:border-2"
                            style={{ 
                              borderColor: '#dddfe2',
                              color: '#1c1e21'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#1877f2';
                              e.target.style.boxShadow = '0 0 0 2px #e7f3ff';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#dddfe2';
                              e.target.style.boxShadow = 'none';
                            }}
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage className="text-[13px] mt-1" style={{ color: '#be4b49' }} />
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
                            className="w-full h-[52px] text-[17px] px-4 border rounded-md bg-white focus:outline-none focus:border-2"
                            style={{ 
                              borderColor: '#dddfe2',
                              color: '#1c1e21'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#1877f2';
                              e.target.style.boxShadow = '0 0 0 2px #e7f3ff';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#dddfe2';
                              e.target.style.boxShadow = 'none';
                            }}
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage className="text-[13px] mt-1" style={{ color: '#be4b49' }} />
                      </FormItem>
                    )}
                  />

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full h-12 text-white text-[20px] font-bold rounded-md transition-colors disabled:opacity-70"
                    style={{ backgroundColor: '#1877f2' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#166fe5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1877f2'}
                    data-testid="button-login"
                  >
                    {isLoggingIn ? "Logging in..." : "Log in"}
                  </button>
                </form>
              </Form>

              <div className="text-center mt-4">
                <a
                  href="#"
                  className="text-[14px] hover:underline"
                  style={{ color: '#1877f2' }}
                  data-testid="link-forgotten-password"
                >
                  Forgotten password?
                </a>
              </div>

              <div className="my-5 border-t" style={{ borderColor: '#dadde1' }} />

              <div className="text-center">
                <button
                  onClick={() => setSignupOpen(true)}
                  className="h-12 px-4 text-white text-[17px] font-bold rounded-md transition-colors"
                  style={{ backgroundColor: '#42b72a' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#36a420'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#42b72a'}
                  data-testid="button-create-account"
                >
                  Create new account
                </button>
              </div>
            </div>

            <p className="text-center mt-7 text-[14px]" style={{ color: '#1c1e21' }}>
              <a href="#" className="font-semibold hover:underline" data-testid="link-create-page">Create a Page</a>
              {" "}for a celebrity, brand or business.
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-white py-3 md:py-5 px-4" style={{ borderTop: '1px solid #e5e5e5' }}>
        <div className="max-w-[980px] mx-auto">
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] md:text-[12px] mb-2" style={{ color: '#8a8d91' }}>
            {languages.slice(0, 9).map((lang, idx) => (
              <a 
                key={idx} 
                href="#" 
                className="hover:underline"
                data-testid={`link-language-${idx}`}
              >
                {lang}
              </a>
            ))}
            <button 
              className="w-7 h-5 rounded text-[11px] flex items-center justify-center"
              style={{ 
                backgroundColor: '#f5f6f7', 
                border: '1px solid #ccd0d5',
                color: '#4b4f56'
              }}
              data-testid="button-more-languages"
            >
              +
            </button>
          </div>

          <div className="my-2 border-t" style={{ borderColor: '#dadde1' }} />

          <div className="flex flex-wrap gap-x-2 md:gap-x-3 gap-y-0 text-[11px] md:text-[12px] leading-6 md:leading-7" style={{ color: '#8a8d91' }}>
            {footerLinks.map((link, idx) => (
              <a 
                key={idx} 
                href="#" 
                className="hover:underline"
                data-testid={`link-footer-${idx}`}
              >
                {link}
              </a>
            ))}
          </div>

          <p className="text-[11px] mt-3 md:mt-4" style={{ color: '#8a8d91' }} data-testid="text-copyright">
            Meta © 2024
          </p>
        </div>
      </footer>

      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent className="sm:max-w-[432px] p-0 gap-0 bg-white rounded-lg overflow-hidden border-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-[32px] font-bold leading-tight" style={{ color: '#1c1e21' }}>Sign Up</DialogTitle>
            <DialogDescription className="text-[15px] mt-1" style={{ color: '#606770' }}>
              It's quick and easy.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 border-t" style={{ borderColor: '#dadde1' }} />

          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="p-4 space-y-3">
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
                          className="w-full h-10 text-[15px] px-3 border rounded-md"
                          style={{ 
                            backgroundColor: '#f5f6f7', 
                            borderColor: '#ccd0d5',
                            color: '#1c1e21'
                          }}
                          data-testid="input-firstname"
                        />
                      </FormControl>
                      <FormMessage className="text-[12px]" style={{ color: '#be4b49' }} />
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
                          placeholder="Surname"
                          className="w-full h-10 text-[15px] px-3 border rounded-md"
                          style={{ 
                            backgroundColor: '#f5f6f7', 
                            borderColor: '#ccd0d5',
                            color: '#1c1e21'
                          }}
                          data-testid="input-lastname"
                        />
                      </FormControl>
                      <FormMessage className="text-[12px]" style={{ color: '#be4b49' }} />
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
                        placeholder="Mobile number or email address"
                        className="w-full h-10 text-[15px] px-3 border rounded-md"
                        style={{ 
                          backgroundColor: '#f5f6f7', 
                          borderColor: '#ccd0d5',
                          color: '#1c1e21'
                        }}
                        data-testid="input-signup-email"
                      />
                    </FormControl>
                    <FormMessage className="text-[12px]" style={{ color: '#be4b49' }} />
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
                        placeholder="New password"
                        className="w-full h-10 text-[15px] px-3 border rounded-md"
                        style={{ 
                          backgroundColor: '#f5f6f7', 
                          borderColor: '#ccd0d5',
                          color: '#1c1e21'
                        }}
                        data-testid="input-signup-password"
                      />
                    </FormControl>
                    <FormMessage className="text-[12px]" style={{ color: '#be4b49' }} />
                  </FormItem>
                )}
              />

              <div>
                <div className="flex items-center gap-1">
                  <label className="text-[12px]" style={{ color: '#606770' }}>Date of birth</label>
                  <CircleHelp className="w-3 h-3" style={{ color: '#606770' }} />
                </div>
                <div className="flex gap-3 mt-1">
                  <select
                    className="flex-1 h-9 px-2 text-[15px] border rounded-md bg-white cursor-pointer"
                    style={{ borderColor: '#ccd0d5', color: '#1c1e21' }}
                    value={signupForm.watch("birthday.month")}
                    onChange={(e) => signupForm.setValue("birthday.month", e.target.value)}
                    data-testid="select-birthday-month"
                  >
                    {months.map((m, idx) => (
                      <option key={idx} value={String(idx)}>{m}</option>
                    ))}
                  </select>
                  <select
                    className="flex-1 h-9 px-2 text-[15px] border rounded-md bg-white cursor-pointer"
                    style={{ borderColor: '#ccd0d5', color: '#1c1e21' }}
                    value={signupForm.watch("birthday.day")}
                    onChange={(e) => signupForm.setValue("birthday.day", e.target.value)}
                    data-testid="select-birthday-day"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    className="flex-1 h-9 px-2 text-[15px] border rounded-md bg-white cursor-pointer"
                    style={{ borderColor: '#ccd0d5', color: '#1c1e21' }}
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
                <div className="flex items-center gap-1">
                  <label className="text-[12px]" style={{ color: '#606770' }}>Gender</label>
                  <CircleHelp className="w-3 h-3" style={{ color: '#606770' }} />
                </div>
                <div className="flex gap-3 mt-1">
                  {[
                    { value: "female", label: "Female" },
                    { value: "male", label: "Male" },
                    { value: "custom", label: "Custom" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex-1 flex items-center justify-between h-9 px-3 border rounded-md cursor-pointer"
                      style={{ borderColor: '#ccd0d5' }}
                    >
                      <span className="text-[15px]" style={{ color: '#1c1e21' }}>{option.label}</span>
                      <input
                        type="radio"
                        name="gender"
                        value={option.value}
                        onChange={(e) => signupForm.setValue("gender", e.target.value)}
                        checked={signupForm.watch("gender") === option.value}
                        className="w-4 h-4 cursor-pointer"
                        data-testid={`radio-gender-${option.value}`}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-[11px] leading-4" style={{ color: '#777' }}>
                People who use our service may have uploaded your contact information to Facebook.{" "}
                <a href="#" className="hover:underline" style={{ color: '#385898' }}>Learn more</a>.
              </p>

              <p className="text-[11px] leading-4" style={{ color: '#777' }}>
                By clicking Sign Up, you agree to our{" "}
                <a href="#" className="hover:underline" style={{ color: '#385898' }}>Terms</a>,{" "}
                <a href="#" className="hover:underline" style={{ color: '#385898' }}>Privacy Policy</a> and{" "}
                <a href="#" className="hover:underline" style={{ color: '#385898' }}>Cookies Policy</a>.
                You may receive SMS notifications from us and can opt out at any time.
              </p>

              <div className="pt-2 text-center">
                <button
                  type="submit"
                  disabled={isSigningUp}
                  className="h-9 px-16 text-white text-[18px] font-bold rounded-md transition-colors disabled:opacity-70"
                  style={{ backgroundColor: '#00a400' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#009200'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00a400'}
                  data-testid="button-signup-submit"
                >
                  {isSigningUp ? "Signing up..." : "Sign Up"}
                </button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
