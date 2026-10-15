import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users2, ShieldCheck, KeyRound, Search, Plus, MoreHorizontal, Mail,
  ShieldAlert, ShieldOff, Trash2, RotateCcw, Copy, Check, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ADMIN_ROLES, type AdminRole } from "@/lib/admin-role-store";
import {
  useTeam, PERMISSION_GROUPS, ROLE_PERMISSIONS, ROLE_LABEL,
  getRolePermissions, type TeamMember, type MemberStatus, type PermissionKey,
} from "@/lib/team-store";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
}

const STATUS_STYLES: Record<MemberStatus, string> = {
  active: "bg-ink text-white border-ink",
  invited: "bg-amber-50 text-amber-700 border-amber-200",
  suspended: "bg-rose-50 text-rose-700 border-rose-200",
};

export function AdminTeam() {
  const { members, overrides, invite, updateMember, removeMember, resendInvite, setRolePermissions, resetRolePermissions, hydrate } = useTeam();
  const [tab, setTab] = useState("members");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AdminRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [drawer, setDrawer] = useState<TeamMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole>("super_admin");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return members.filter(m => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (t && !(m.name.toLowerCase().includes(t) || m.email.toLowerCase().includes(t))) return false;
      return true;
    });
  }, [members, q, roleFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: members.length,
    active: members.filter(m => m.status === "active").length,
    invited: members.filter(m => m.status === "invited").length,
    twoFactor: members.filter(m => m.twoFactor).length,
  }), [members]);

  const rolePerms = getRolePermissions(selectedRole, overrides);
  const isOverridden = !!overrides[selectedRole];

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">System</div>
          <h1 className="text-2xl font-medium mt-1">Team & Roles</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage admin members, invitations, and role permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/audit">View audit log</Link>
          </Button>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Invite member
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Team members", value: stats.total, icon: Users2 },
          { label: "Active", value: stats.active, icon: ShieldCheck },
          { label: "Pending invites", value: stats.invited, icon: Mail },
          { label: "2FA enabled", value: `${stats.twoFactor}/${stats.total}`, icon: KeyRound },
        ].map(k => (
          <Card key={k.label} className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-neutral-500">{k.label}</div>
              <k.icon className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-2xl font-medium mt-2">{k.value}</div>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="roles">Roles & permissions</TabsTrigger>
          <TabsTrigger value="policy">Access policy</TabsTrigger>
        </TabsList>

        {/* Members */}
        <TabsContent value="members" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email" className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={v => setRoleFilter(v as typeof roleFilter)}>
              <SelectTrigger className="w-[200px]"><Filter className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ADMIN_ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>2FA</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(m => (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => setDrawer(m)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full text-white text-xs flex items-center justify-center font-medium" style={{ background: m.avatarColor }}>
                          {initials(m.name)}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{m.name}</div>
                          <div className="text-xs text-neutral-500">{m.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm">{ROLE_LABEL[m.role]}</span></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLES[m.status]}>{m.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {m.twoFactor
                        ? <Badge variant="outline" className="bg-ink text-white border-ink">On</Badge>
                        : <Badge variant="outline" className="bg-neutral-100 text-neutral-600 border-neutral-200">Off</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-600">{timeAgo(m.lastActiveAt)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDrawer(m)}>Edit member</DropdownMenuItem>
                          {m.status === "invited" && (
                            <DropdownMenuItem onClick={() => { resendInvite(m.id); toast.success("Invite resent"); }}>
                              <RotateCcw className="w-4 h-4 mr-2" /> Resend invite
                            </DropdownMenuItem>
                          )}
                          {m.status === "active" && (
                            <DropdownMenuItem onClick={() => { updateMember(m.id, { status: "suspended" }); toast("Member suspended"); }}>
                              <ShieldOff className="w-4 h-4 mr-2" /> Suspend
                            </DropdownMenuItem>
                          )}
                          {m.status === "suspended" && (
                            <DropdownMenuItem onClick={() => { updateMember(m.id, { status: "active" }); toast.success("Reactivated"); }}>
                              <ShieldCheck className="w-4 h-4 mr-2" /> Reactivate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600" onClick={() => { removeMember(m.id); toast("Member removed"); }}>
                            <Trash2 className="w-4 h-4 mr-2" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-neutral-500 py-10">No members match your filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Roles */}
        <TabsContent value="roles" className="mt-4">
          <div className="grid grid-cols-12 gap-6">
            <Card className="col-span-12 lg:col-span-4 p-2">
              <div className="px-3 py-2 text-xs uppercase tracking-wider text-neutral-500">Roles</div>
              <div className="space-y-0.5">
                {ADMIN_ROLES.map(r => {
                  const count = members.filter(m => m.role === r.id).length;
                  const active = selectedRole === r.id;
                  const custom = !!overrides[r.id];
                  return (
                    <button key={r.id} onClick={() => setSelectedRole(r.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-md flex items-center justify-between transition ${active ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"}`}>
                      <div>
                        <div className="text-sm font-medium">{r.label}</div>
                        <div className={`text-xs ${active ? "text-neutral-400" : "text-neutral-500"}`}>
                          {count} member{count === 1 ? "" : "s"}{custom ? " · custom" : ""}
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${active ? "bg-white/10" : "bg-neutral-100"}`}>{r.short}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="col-span-12 lg:col-span-8 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">{ROLE_LABEL[selectedRole]}</h3>
                    {isOverridden && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Custom</Badge>}
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">
                    {rolePerms.length} of {PERMISSION_GROUPS.flatMap(g => g.items).length} permissions granted.
                  </p>
                </div>
                {isOverridden && (
                  <Button variant="outline" size="sm" onClick={() => { resetRolePermissions(selectedRole); toast("Reset to default"); }}>
                    Reset to default
                  </Button>
                )}
              </div>
              <Separator />
              <div className="space-y-6 mt-5">
                {PERMISSION_GROUPS.map(group => (
                  <div key={group.id}>
                    <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">{group.label}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {group.items.map(p => {
                        const checked = rolePerms.includes(p.key);
                        const locked = selectedRole === "super_admin";
                        return (
                          <label key={p.key} className={`flex items-start gap-2.5 p-2.5 rounded-md border ${checked ? "border-neutral-300 bg-neutral-50" : "border-neutral-200"} ${locked ? "opacity-70" : "cursor-pointer hover:bg-neutral-50"}`}>
                            <Checkbox
                              checked={checked}
                              disabled={locked}
                              onCheckedChange={(v) => {
                                const next = new Set(rolePerms);
                                if (v) next.add(p.key); else next.delete(p.key);
                                setRolePermissions(selectedRole, Array.from(next) as PermissionKey[]);
                              }}
                            />
                            <div className="text-sm">{p.label}</div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {selectedRole === "super_admin" && (
                  <div className="flex items-start gap-2 text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded p-3">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    Super Admin always has every permission. This role cannot be edited.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Policy */}
        <TabsContent value="policy" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="text-base font-medium">Sign-in security</h3>
                <p className="text-sm text-neutral-500">Baseline requirements for every admin.</p>
              </div>
              <PolicyRow label="Require 2FA for all members" desc="Members without 2FA are prompted at next sign-in." defaultOn />
              <PolicyRow label="SSO via Google Workspace" desc="Restrict sign-in to @asloriginals.com Google accounts." defaultOn />
              <PolicyRow label="Enforce strong passwords" desc="Minimum 12 characters, one number, one symbol." defaultOn />
              <PolicyRow label="Auto sign-out after 30 minutes idle" desc="Applies to Ops, Finance, and Super Admin roles." />
            </Card>
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="text-base font-medium">Access & audit</h3>
                <p className="text-sm text-neutral-500">Session, IP, and audit controls.</p>
              </div>
              <PolicyRow label="Restrict to office IP allow-list" desc="Only allow sign-ins from configured IP ranges." />
              <PolicyRow label="Log every admin action" desc="Includes reads on customer PII and wallet changes." defaultOn />
              <PolicyRow label="Alert on suspended member re-attempt" desc="Notify Super Admins via email and Slack." defaultOn />
              <PolicyRow label="Weekly access review digest" desc="Emailed to Super Admins every Monday 09:00." />
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvite={(payload) => { invite(payload); toast.success(`Invite sent to ${payload.email}`); }} />
      <MemberDrawer member={drawer} onClose={() => setDrawer(null)} onSave={updateMember} />
    </div>
  );
}

function PolicyRow({ label, desc, defaultOn = false }: { label: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-neutral-500 mt-0.5">{desc}</div>
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </div>
  );
}

function InviteDialog({ open, onOpenChange, onInvite }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onInvite: (p: { name: string; email: string; role: AdminRole }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("support");
  const [copied, setCopied] = useState(false);
  const link = `https://asloriginals.online/admin/invite/${Math.random().toString(36).slice(2, 10)}`;

  const submit = () => {
    if (!email.includes("@")) { toast.error("Valid email required"); return; }
    onInvite({ name, email, role });
    setName(""); setEmail(""); setRole("support");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>They'll receive an email with a one-time sign-in link.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Full name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Amara Obi" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@asloriginals.com" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={v => setRole(v as AdminRole)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ADMIN_ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="text-xs text-neutral-500 mt-1.5">
              {ROLE_PERMISSIONS[role].length} permissions granted by default.
            </div>
          </div>
          <div className="rounded border border-dashed border-neutral-300 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500 mb-1">Or share invite link</div>
            <div className="flex items-center gap-2">
              <code className="font-sans text-xs flex-1 truncate">{link}</code>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Send invite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemberDrawer({ member, onClose, onSave }: {
  member: TeamMember | null; onClose: () => void;
  onSave: (id: string, patch: Partial<TeamMember>) => void;
}) {
  if (!member) return null;
  return (
    <Sheet open={!!member} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full text-white text-sm flex items-center justify-center font-medium" style={{ background: member.avatarColor }}>
              {initials(member.name)}
            </div>
            <div>
              <SheetTitle>{member.name}</SheetTitle>
              <SheetDescription>{member.email}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={member.role} onValueChange={v => onSave(member.id, { role: v as AdminRole })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ADMIN_ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={member.status} onValueChange={v => onSave(member.id, { status: v as MemberStatus })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="text-sm font-medium">Two-factor authentication</div>
              <div className="text-xs text-neutral-500 mt-0.5">Required by policy for sensitive roles.</div>
            </div>
            <Switch checked={member.twoFactor} onCheckedChange={v => onSave(member.id, { twoFactor: v })} />
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Recent activity</div>
            <div className="space-y-2 text-sm">
              {[
                { t: "Signed in from Lagos, NG · Chrome on macOS", ago: "2h ago" },
                { t: "Updated order #ASL-104829", ago: "3h ago" },
                { t: "Replied to concierge request #CR-2318", ago: "yesterday" },
                { t: "Enabled 2FA", ago: "3 days ago" },
              ].map((a, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-1.5 border-b last:border-b-0">
                  <span className="text-neutral-800">{a.t}</span>
                  <span className="text-xs text-neutral-500 shrink-0">{a.ago}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-neutral-500">
            Member since {new Date(member.createdAt).toLocaleDateString()} · Last active {timeAgo(member.lastActiveAt)}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
