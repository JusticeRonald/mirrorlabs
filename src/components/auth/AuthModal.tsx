import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DemoAccessCard } from './DemoAccessCard';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { loginAsDemo } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  const handleDemoAccess = () => {
    loginAsDemo();
    onOpenChange(false);
  };

  const handleSuccess = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] top-[15%] translate-y-0">
        <DialogHeader>
          <DialogTitle>Welcome to Mirror Labs</DialogTitle>
          <DialogDescription>
            Sign in to access your projects or try the demo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Demo Access Card */}
          <DemoAccessCard onDemoAccess={handleDemoAccess} />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or sign in
              </span>
            </div>
          </div>

          {/* Auth Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <motion.div className="mt-4 overflow-hidden" layout transition={{ duration: 0.2, ease: "easeInOut" }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.05 }}
                  layout
                >
                  {activeTab === 'login' ? (
                    <LoginForm onSuccess={handleSuccess} />
                  ) : (
                    <SignupForm onSuccess={handleSuccess} />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
