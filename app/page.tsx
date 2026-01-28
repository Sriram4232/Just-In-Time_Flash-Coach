import { DotScreenShader } from "@/components/ui/dot-shader-background";
import { LoginForm } from "@/components/login-form";

export default function DemoOne() {
  return (
    <div className="h-svh w-screen flex flex-col gap-8 items-center justify-center relative">
      <div className="absolute inset-0">
        <DotScreenShader />
      </div>
      <h1 className="relative z-10 text-6xl md:text-8xl font-bold tracking-tighter text-indigo-950 whitespace-nowrap pointer-events-none mb-4">
        FLASH COACH
      </h1>
      <p className="relative z-10 text-xl md:text-2xl font-medium text-center text-slate-700 max-w-2xl leading-relaxed pointer-events-none mb-12">
        Because great teaching needs instant support.
      </p>

      <div className="z-10 w-full flex justify-center px-4">
        <LoginForm />
      </div>
    </div>
  );
}
