'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Car,
  Shield,
  User,
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LoginPage() {
  const router = useRouter();
  const users = useFleetFlowStore((s) => s.users);
  const setCurrentUser = useFleetFlowStore((s) => s.setCurrentUser);

  const handleSelectPersona = (userId: string, role: string) => {
    setCurrentUser(userId);
    if (role === 'EMPLOYEE') {
      router.push('/employee/dashboard');
    } else {
      router.push(`/demo/preview?role=${role}`);
    }
  };

  const employees = users.filter((u) => u.role === 'EMPLOYEE');
  const admins = users.filter((u) => u.role === 'ADMIN');
  const drivers = users.filter((u) => u.role === 'DRIVER');

  return (
    <div className="container max-w-5xl mx-auto py-12 px-4 space-y-8">
      {/* Brand Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
          <Car className="h-4 w-4" />
          <span>FleetFlow Prototype • Phase 3A</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Corporate Vehicle Request & Trip Coordination
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Select a demo persona below to explore FleetFlow with pre-configured corporate permissions and live seed records.
        </p>
      </div>

      {/* Personas Section */}
      <div className="space-y-6">
        {/* Employees (Phase 3A Focus) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <User className="h-4 w-4 text-primary" />
              <span>Employee Personas (Interactive Phase 3A)</span>
            </h2>
            <Badge variant="default" className="text-xs bg-emerald-600">
              Full Access Ready
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Test end-to-end request creation, colleague manifests, search/filtering, and cancellation.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <Card
                key={emp.id}
                onClick={() => handleSelectPersona(emp.id, emp.role)}
                className="hover:border-primary cursor-pointer hover:shadow-md transition-all group border-border"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-muted-foreground">{emp.id}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {emp.department || 'Employee'}
                    </Badge>
                  </div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors">
                    {emp.name}
                  </CardTitle>
                  <CardDescription className="text-xs">{emp.email}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 text-xs">
                  <div className="flex items-center justify-between text-primary font-medium pt-2 border-t">
                    <span>Enter as {emp.name.split(' ')[0]}</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Admin & Driver (Preview Boundaries) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          {/* Admin */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Shield className="h-4 w-4 text-blue-600" />
                <span>Fleet Administrator</span>
              </h3>
              <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-200">
                Phase 4 Preview
              </Badge>
            </div>
            {admins.map((adm) => (
              <Card
                key={adm.id}
                onClick={() => handleSelectPersona(adm.id, adm.role)}
                className="hover:border-blue-400 cursor-pointer transition-all border-dashed"
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{adm.name}</div>
                      <div className="text-xs text-muted-foreground">Fleet Operations Manager</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Driver */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Car className="h-4 w-4 text-violet-600" />
                <span>Fleet Driver</span>
              </h3>
              <Badge variant="outline" className="text-[10px] text-violet-700 border-violet-200">
                Phase 5 Preview
              </Badge>
            </div>
            {drivers.map((drv) => (
              <Card
                key={drv.id}
                onClick={() => handleSelectPersona(drv.id, drv.role)}
                className="hover:border-violet-400 cursor-pointer transition-all border-dashed"
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{drv.name}</div>
                      <div className="text-xs text-muted-foreground">Senior Company Driver</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
