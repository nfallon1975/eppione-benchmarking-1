"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  BarChart3,
  RefreshCw,
  Loader2,
  Trash2,
  UserCog,
  Plus,
  UserPlus,
  Mail,
  Building,
} from "lucide-react";
import { BENEFIT_CATEGORY_LABELS, COUNTRY_LABELS } from "@/lib/utils";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  companyRole: string | null;
  createdAt: string;
  company: {
    id: string;
    name: string;
    country: string;
    employeeCount: number;
  } | null;
  brokerProfile: {
    companyName: string;
    licenseNumber: string | null;
    countriesActive: string[];
  } | null;
}

interface ComplianceItem {
  type: "requirement" | "limit";
  id: string;
  country: string;
  category: string;
  description: string;
  contributedBy: string;
  createdAt: string;
}

interface AdminBroker {
  id: string;
  email: string;
  name: string | null;
  status: string;
  createdAt: string;
  brokerProfile: {
    id: string;
    companyName: string;
    licenseNumber: string | null;
    countriesActive: string[];
  } | null;
  brokerClients: {
    id: string;
    status: string;
    company: { id: string; name: string } | null;
  }[];
}

interface CoverageItem {
  country: string;
  countryName: string;
  requirements: number;
  requirementsVerified: number;
  limits: number;
  limitsVerified: number;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [coverage, setCoverage] = useState<CoverageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteMode, setDeleteMode] = useState<"anonymize" | "full">("anonymize");
  const [deleting, setDeleting] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<AdminUser | null>(null);
  const [replaceName, setReplaceName] = useState("");
  const [replaceEmail, setReplaceEmail] = useState("");
  const [replacing, setReplacing] = useState(false);
  // Create Client state
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [createCompanyName, setCreateCompanyName] = useState("");
  const [createCountry, setCreateCountry] = useState("");
  const [createIndustry, setCreateIndustry] = useState("");
  const [createEmployeeCount, setCreateEmployeeCount] = useState("");
  const [createUserName, setCreateUserName] = useState("");
  const [createUserEmail, setCreateUserEmail] = useState("");
  const [creating, setCreating] = useState(false);
  // Add User state
  const [addUserTarget, setAddUserTarget] = useState<AdminUser | null>(null);
  const [addUserName, setAddUserName] = useState("");
  const [addUserEmail, setAddUserEmail] = useState("");
  const [addUserRole, setAddUserRole] = useState<"OWNER" | "CONTRIBUTOR" | "VIEWER">("CONTRIBUTOR");
  const [addingUser, setAddingUser] = useState(false);
  // Create Broker state
  const [showCreateBroker, setShowCreateBroker] = useState(false);
  const [createBrokerName, setCreateBrokerName] = useState("");
  const [createBrokerEmail, setCreateBrokerEmail] = useState("");
  const [createBrokerCompany, setCreateBrokerCompany] = useState("");
  const [createBrokerLicense, setCreateBrokerLicense] = useState("");
  const [createBrokerCountries, setCreateBrokerCountries] = useState("");
  const [creatingBroker, setCreatingBroker] = useState(false);
  // Broker Management state
  const [brokers, setBrokers] = useState<AdminBroker[]>([]);
  const [editBroker, setEditBroker] = useState<AdminBroker | null>(null);
  const [editBrokerName, setEditBrokerName] = useState("");
  const [editBrokerEmail, setEditBrokerEmail] = useState("");
  const [editBrokerCompany, setEditBrokerCompany] = useState("");
  const [editBrokerLicense, setEditBrokerLicense] = useState("");
  const [editBrokerCountries, setEditBrokerCountries] = useState("");
  const [editingBroker, setEditingBroker] = useState(false);
  const [deleteBrokerTarget, setDeleteBrokerTarget] = useState<AdminBroker | null>(null);
  const [deletingBroker, setDeletingBroker] = useState(false);
  // Add Broker User state
  const [addBrokerUserTarget, setAddBrokerUserTarget] = useState<AdminBroker | null>(null);
  const [addBrokerUserName, setAddBrokerUserName] = useState("");
  const [addBrokerUserEmail, setAddBrokerUserEmail] = useState("");
  const [addingBrokerUser, setAddingBrokerUser] = useState(false);
  // Search state
  const [userSearch, setUserSearch] = useState("");
  const [brokerSearch, setBrokerSearch] = useState("");
  // Invite state
  const [invitingEmail, setInvitingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return; // wait for session to load
    if (session.user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchUsers();
    fetchBrokers();
    fetchComplianceItems();
    fetchCoverage();
  }, [session, router]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBrokers() {
    try {
      const res = await fetch("/api/admin/brokers");
      if (res.ok) {
        const data = await res.json();
        setBrokers(data);
      }
    } catch (err) {
      console.error("Failed to fetch brokers:", err);
    }
  }

  async function fetchComplianceItems() {
    try {
      const res = await fetch("/api/admin/compliance");
      if (res.ok) {
        const data = await res.json();
        setComplianceItems(data);
      }
    } catch (err) {
      console.error("Failed to fetch compliance items:", err);
    }
  }

  async function fetchCoverage() {
    try {
      const res = await fetch("/api/admin/compliance?view=coverage");
      if (res.ok) {
        const data = await res.json();
        setCoverage(data);
      }
    } catch (err) {
      console.error("Failed to fetch coverage:", err);
    }
  }

  async function verifyComplianceItem(type: string, id: string) {
    try {
      await fetch("/api/admin/compliance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      fetchComplianceItems();
    } catch (err) {
      console.error("Failed to verify item:", err);
    }
  }

  async function rejectComplianceItem(type: string, id: string) {
    try {
      await fetch(`/api/admin/compliance?type=${type}&id=${id}`, {
        method: "DELETE",
      });
      fetchComplianceItems();
    } catch (err) {
      console.error("Failed to reject item:", err);
    }
  }

  async function rerunComplianceForCountry(country: string) {
    setRerunning(country);
    try {
      await fetch("/api/admin/compliance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rerun", country }),
      });
    } catch (err) {
      console.error("Failed to re-run compliance:", err);
    } finally {
      setRerunning(null);
    }
  }

  async function updateStatus(userId: string, status: "APPROVED" | "REJECTED") {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.company) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/clients/${deleteTarget.company.id}?mode=${deleteMode}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDeleteTarget(null);
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete client");
      }
    } catch {
      alert("Failed to delete client");
    } finally {
      setDeleting(false);
    }
  }

  async function handleReplaceContact() {
    if (!replaceTarget?.company) return;
    setReplacing(true);
    try {
      const res = await fetch(
        `/api/admin/clients/${replaceTarget.company.id}/replace-contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: replaceName, email: replaceEmail }),
        }
      );
      if (res.ok) {
        setReplaceTarget(null);
        setReplaceName("");
        setReplaceEmail("");
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to replace contact");
      }
    } catch {
      alert("Failed to replace contact");
    } finally {
      setReplacing(false);
    }
  }

  async function handleCreateClient() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: createCompanyName,
          country: createCountry.toUpperCase(),
          industry: createIndustry,
          employeeCount: parseInt(createEmployeeCount) || 0,
          userName: createUserName,
          userEmail: createUserEmail,
        }),
      });
      if (res.ok) {
        setShowCreateClient(false);
        setCreateCompanyName("");
        setCreateCountry("");
        setCreateIndustry("");
        setCreateEmployeeCount("");
        setCreateUserName("");
        setCreateUserEmail("");
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create client");
      }
    } catch {
      alert("Failed to create client");
    } finally {
      setCreating(false);
    }
  }

  async function handleAddUser() {
    if (!addUserTarget?.company) return;
    setAddingUser(true);
    try {
      const res = await fetch(
        `/api/admin/clients/${addUserTarget.company.id}/users`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: addUserName,
            email: addUserEmail,
            companyRole: addUserRole,
          }),
        }
      );
      if (res.ok) {
        setAddUserTarget(null);
        setAddUserName("");
        setAddUserEmail("");
        setAddUserRole("CONTRIBUTOR");
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add user");
      }
    } catch {
      alert("Failed to add user");
    } finally {
      setAddingUser(false);
    }
  }

  async function handleCreateBroker() {
    setCreatingBroker(true);
    try {
      const countriesActive = createBrokerCountries
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c.length === 2);
      const res = await fetch("/api/admin/brokers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createBrokerName,
          email: createBrokerEmail,
          companyName: createBrokerCompany,
          licenseNumber: createBrokerLicense || undefined,
          countriesActive,
        }),
      });
      if (res.ok) {
        setShowCreateBroker(false);
        setCreateBrokerName("");
        setCreateBrokerEmail("");
        setCreateBrokerCompany("");
        setCreateBrokerLicense("");
        setCreateBrokerCountries("");
        fetchUsers();
        fetchBrokers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create broker");
      }
    } catch {
      alert("Failed to create broker");
    } finally {
      setCreatingBroker(false);
    }
  }

  async function handleEditBroker() {
    if (!editBroker) return;
    setEditingBroker(true);
    try {
      const countriesActive = editBrokerCountries
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c.length === 2);
      const res = await fetch("/api/admin/brokers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editBroker.id,
          name: editBrokerName,
          email: editBrokerEmail,
          companyName: editBrokerCompany,
          licenseNumber: editBrokerLicense || null,
          countriesActive,
        }),
      });
      if (res.ok) {
        setEditBroker(null);
        fetchBrokers();
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update broker");
      }
    } catch {
      alert("Failed to update broker");
    } finally {
      setEditingBroker(false);
    }
  }

  async function handleDeleteBroker() {
    if (!deleteBrokerTarget) return;
    setDeletingBroker(true);
    try {
      const res = await fetch(
        `/api/admin/brokers?userId=${deleteBrokerTarget.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDeleteBrokerTarget(null);
        fetchBrokers();
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete broker");
      }
    } catch {
      alert("Failed to delete broker");
    } finally {
      setDeletingBroker(false);
    }
  }

  async function handleAddBrokerUser() {
    if (!addBrokerUserTarget) return;
    setAddingBrokerUser(true);
    try {
      const res = await fetch("/api/admin/brokers/add-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brokerId: addBrokerUserTarget.id,
          name: addBrokerUserName,
          email: addBrokerUserEmail,
        }),
      });
      if (res.ok) {
        setAddBrokerUserTarget(null);
        setAddBrokerUserName("");
        setAddBrokerUserEmail("");
        fetchBrokers();
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add broker user");
      }
    } catch {
      alert("Failed to add broker user");
    } finally {
      setAddingBrokerUser(false);
    }
  }

  async function handleInvite(email: string) {
    setInvitingEmail(email);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Invite sent (${data.version || "unknown"}, token: ${data.tokenPrefix || "?"})`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to send invite");
      }
    } catch {
      alert("Failed to send invite");
    } finally {
      setInvitingEmail(null);
    }
  }

  const pendingCount = users.filter((u) => u.status === "PENDING").length;
  const approvedCount = users.filter((u) => u.status === "APPROVED").length;
  const totalCompanies = new Set(
    users.filter((u) => u.company).map((u) => u.company!.name)
  ).size;
  const totalCoverageData = coverage.reduce((sum, c) => sum + c.requirements + c.limits, 0);

  const groupedUsers = useMemo(() => {
    const term = userSearch.toLowerCase().trim();
    const companyMap = new Map<
      string,
      { company: NonNullable<AdminUser["company"]>; users: AdminUser[] }
    >();
    const noCompany: AdminUser[] = [];

    for (const user of users) {
      if (user.company) {
        // Match on company name, user name, or email
        if (
          term &&
          !user.company.name.toLowerCase().includes(term) &&
          !(user.name ?? "").toLowerCase().includes(term) &&
          !user.email.toLowerCase().includes(term)
        ) {
          continue;
        }
        const key = user.company.id;
        if (!companyMap.has(key)) {
          companyMap.set(key, { company: user.company, users: [] });
        }
        companyMap.get(key)!.users.push(user);
      } else {
        if (
          term &&
          !(user.name ?? "").toLowerCase().includes(term) &&
          !user.email.toLowerCase().includes(term)
        ) {
          continue;
        }
        noCompany.push(user);
      }
    }

    return {
      companies: Array.from(companyMap.values()),
      noCompany,
    };
  }, [users, userSearch]);

  const groupedBrokers = useMemo(() => {
    const term = brokerSearch.toLowerCase().trim();
    const firmMap = new Map<
      string,
      {
        companyName: string;
        licenseNumber: string | null;
        countriesActive: string[];
        brokers: AdminBroker[];
        totalClients: { active: number; pending: number };
      }
    >();
    const noFirm: AdminBroker[] = [];

    for (const broker of brokers) {
      if (
        term &&
        !(broker.name ?? "").toLowerCase().includes(term) &&
        !broker.email.toLowerCase().includes(term) &&
        !(broker.brokerProfile?.companyName ?? "").toLowerCase().includes(term)
      ) {
        continue;
      }

      const firmName = broker.brokerProfile?.companyName;
      if (firmName) {
        if (!firmMap.has(firmName)) {
          firmMap.set(firmName, {
            companyName: firmName,
            licenseNumber: broker.brokerProfile!.licenseNumber,
            countriesActive: broker.brokerProfile!.countriesActive,
            brokers: [],
            totalClients: { active: 0, pending: 0 },
          });
        }
        const group = firmMap.get(firmName)!;
        group.brokers.push(broker);
        group.totalClients.active += broker.brokerClients.filter(
          (r) => r.status === "ACTIVE"
        ).length;
        group.totalClients.pending += broker.brokerClients.filter(
          (r) => r.status === "PENDING"
        ).length;
      } else {
        noFirm.push(broker);
      }
    }

    return {
      firms: Array.from(firmMap.values()),
      noFirm,
      isEmpty: firmMap.size === 0 && noFirm.length === 0,
    };
  }, [brokers, brokerSearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
        <p className="mt-1 text-slate-500">Manage users, approvals, and compliance reviews</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Approvals</CardDescription>
            <CardTitle className="text-2xl">{pendingCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Clock className="h-4 w-4" />
              Awaiting review
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved Users</CardDescription>
            <CardTitle className="text-2xl">{approvedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Active accounts
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Companies</CardDescription>
            <CardTitle className="text-2xl">{totalCompanies}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-500">
              Contributing to benchmarking
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Compliance Reviews</CardDescription>
            <CardTitle className="text-2xl">{complianceItems.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <FileCheck className="h-4 w-4" />
              Pending verification
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="brokers">
            Broker Management
            {brokers.length > 0 && (
              <Badge variant="secondary" className="ml-2">{brokers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="compliance">
            Compliance Reviews
            {complianceItems.length > 0 && (
              <Badge variant="warning" className="ml-2">{complianceItems.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="coverage">
            <BarChart3 className="mr-1 h-4 w-4" />
            Coverage Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Review and approve user registrations
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search clients..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-48"
                />
                <Button onClick={() => setShowCreateClient(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Client
                </Button>
                <Button variant="outline" onClick={() => setShowCreateBroker(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Broker
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedUsers.companies.map(({ company, users: companyUsers }) => (
                    <Fragment key={company.id}>
                      <TableRow className="bg-slate-50 hover:bg-slate-100">
                        <TableCell colSpan={6}>
                          <div className="flex items-center gap-3">
                            <Building className="h-4 w-4 text-slate-400" />
                            <span className="font-semibold">{company.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {COUNTRY_LABELS[company.country] || company.country}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {company.employeeCount} employees
                            </span>
                            <span className="text-xs text-slate-400">
                              {companyUsers.length} user{companyUsers.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {companyUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="pl-10 font-medium">
                            <div className="flex items-center gap-2">
                              {user.name ?? "—"}
                              {user.companyRole && (
                                <Badge variant="outline" className="text-xs">
                                  {user.companyRole}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge>{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            {user.status === "PENDING" && (
                              <Badge variant="warning">Pending</Badge>
                            )}
                            {user.status === "APPROVED" && (
                              <Badge variant="success">Approved</Badge>
                            )}
                            {user.status === "REJECTED" && (
                              <Badge variant="destructive">Rejected</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {user.status === "PENDING" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600"
                                    onClick={() => updateStatus(user.id, "APPROVED")}
                                  >
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600"
                                    onClick={() => updateStatus(user.id, "REJECTED")}
                                  >
                                    <XCircle className="mr-1 h-3 w-3" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {user.status === "REJECTED" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatus(user.id, "APPROVED")}
                                >
                                  Approve
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInvite(user.email)}
                                disabled={invitingEmail === user.email}
                              >
                                {invitingEmail === user.email ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <Mail className="mr-1 h-3 w-3" />
                                )}
                                Invite
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAddUserName("");
                                  setAddUserEmail("");
                                  setAddUserRole("CONTRIBUTOR");
                                  setAddUserTarget(user);
                                }}
                              >
                                <UserPlus className="mr-1 h-3 w-3" />
                                Add User
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => {
                                  setDeleteMode("anonymize");
                                  setDeleteTarget(user);
                                }}
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Delete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReplaceName("");
                                  setReplaceEmail("");
                                  setReplaceTarget(user);
                                }}
                              >
                                <UserCog className="mr-1 h-3 w-3" />
                                Replace
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                  {groupedUsers.noCompany.length > 0 && (
                    <Fragment>
                      <TableRow className="bg-slate-50 hover:bg-slate-100">
                        <TableCell colSpan={6}>
                          <span className="font-semibold text-slate-500">
                            Unassigned Users
                          </span>
                          <span className="ml-2 text-xs text-slate-400">
                            {groupedUsers.noCompany.length} user{groupedUsers.noCompany.length !== 1 ? "s" : ""}
                          </span>
                        </TableCell>
                      </TableRow>
                      {groupedUsers.noCompany.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="pl-10 font-medium">
                            {user.name ?? "—"}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === "BROKER" ? "secondary" : user.role === "ADMIN" ? "default" : "outline"}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.status === "PENDING" && (
                              <Badge variant="warning">Pending</Badge>
                            )}
                            {user.status === "APPROVED" && (
                              <Badge variant="success">Approved</Badge>
                            )}
                            {user.status === "REJECTED" && (
                              <Badge variant="destructive">Rejected</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {user.status === "PENDING" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600"
                                    onClick={() => updateStatus(user.id, "APPROVED")}
                                  >
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600"
                                    onClick={() => updateStatus(user.id, "REJECTED")}
                                  >
                                    <XCircle className="mr-1 h-3 w-3" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {user.status === "REJECTED" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatus(user.id, "APPROVED")}
                                >
                                  Approve
                                </Button>
                              )}
                              {user.role !== "ADMIN" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleInvite(user.email)}
                                  disabled={invitingEmail === user.email}
                                >
                                  {invitingEmail === user.email ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <Mail className="mr-1 h-3 w-3" />
                                  )}
                                  Invite
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brokers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Broker Management</CardTitle>
                <CardDescription>
                  Manage broker accounts, update details, and remove access
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search brokers..."
                  value={brokerSearch}
                  onChange={(e) => setBrokerSearch(e.target.value)}
                  className="w-48"
                />
                <Button variant="outline" onClick={() => setShowCreateBroker(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Broker
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Clients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedBrokers.isEmpty && !brokerSearch && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-slate-500 py-8">
                        No brokers registered yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {groupedBrokers.isEmpty && brokerSearch && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-slate-500 py-8">
                        No brokers matching &quot;{brokerSearch}&quot;.
                      </TableCell>
                    </TableRow>
                  )}
                  {groupedBrokers.firms.map((firm) => (
                    <Fragment key={firm.companyName}>
                      <TableRow className="bg-slate-50 hover:bg-slate-100">
                        <TableCell colSpan={6}>
                          <div className="flex items-center gap-3">
                            <Building className="h-4 w-4 text-slate-400" />
                            <span className="font-semibold">{firm.companyName}</span>
                            {firm.licenseNumber && (
                              <span className="text-xs text-slate-500">
                                License: {firm.licenseNumber}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {firm.countriesActive
                                .map((c) => COUNTRY_LABELS[c] || c)
                                .join(", ")}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {firm.totalClients.active} client{firm.totalClients.active !== 1 ? "s" : ""}
                              {firm.totalClients.pending > 0 && (
                                <>, {firm.totalClients.pending} pending</>
                              )}
                            </span>
                            <span className="text-xs text-slate-400">
                              {firm.brokers.length} user{firm.brokers.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {firm.brokers.map((broker) => (
                        <TableRow key={broker.id}>
                          <TableCell className="pl-10 font-medium">
                            {broker.name ?? "—"}
                          </TableCell>
                          <TableCell>{broker.email}</TableCell>
                          <TableCell>
                            {broker.brokerClients.length > 0 ? (
                              <span className="text-sm">
                                {broker.brokerClients.filter((r) => r.status === "ACTIVE").length} active
                                {broker.brokerClients.filter((r) => r.status === "PENDING").length > 0 && (
                                  <>, {broker.brokerClients.filter((r) => r.status === "PENDING").length} pending</>
                                )}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {broker.status === "APPROVED" && (
                              <Badge variant="success">Approved</Badge>
                            )}
                            {broker.status === "PENDING" && (
                              <Badge variant="warning">Pending</Badge>
                            )}
                            {broker.status === "REJECTED" && (
                              <Badge variant="destructive">Rejected</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {new Date(broker.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditBrokerName(broker.name ?? "");
                                  setEditBrokerEmail(broker.email);
                                  setEditBrokerCompany(broker.brokerProfile?.companyName ?? "");
                                  setEditBrokerLicense(broker.brokerProfile?.licenseNumber ?? "");
                                  setEditBrokerCountries(
                                    broker.brokerProfile?.countriesActive?.join(", ") ?? ""
                                  );
                                  setEditBroker(broker);
                                }}
                              >
                                <UserCog className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAddBrokerUserName("");
                                  setAddBrokerUserEmail("");
                                  setAddBrokerUserTarget(broker);
                                }}
                              >
                                <UserPlus className="mr-1 h-3 w-3" />
                                Add User
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInvite(broker.email)}
                                disabled={invitingEmail === broker.email}
                              >
                                {invitingEmail === broker.email ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <Mail className="mr-1 h-3 w-3" />
                                )}
                                Invite
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => setDeleteBrokerTarget(broker)}
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                  {groupedBrokers.noFirm.length > 0 && (
                    <Fragment>
                      <TableRow className="bg-slate-50 hover:bg-slate-100">
                        <TableCell colSpan={6}>
                          <span className="font-semibold text-slate-500">
                            No Firm Assigned
                          </span>
                          <span className="ml-2 text-xs text-slate-400">
                            {groupedBrokers.noFirm.length} user{groupedBrokers.noFirm.length !== 1 ? "s" : ""}
                          </span>
                        </TableCell>
                      </TableRow>
                      {groupedBrokers.noFirm.map((broker) => (
                        <TableRow key={broker.id}>
                          <TableCell className="pl-10 font-medium">
                            {broker.name ?? "—"}
                          </TableCell>
                          <TableCell>{broker.email}</TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-400">—</span>
                          </TableCell>
                          <TableCell>
                            {broker.status === "APPROVED" && (
                              <Badge variant="success">Approved</Badge>
                            )}
                            {broker.status === "PENDING" && (
                              <Badge variant="warning">Pending</Badge>
                            )}
                            {broker.status === "REJECTED" && (
                              <Badge variant="destructive">Rejected</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {new Date(broker.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInvite(broker.email)}
                                disabled={invitingEmail === broker.email}
                              >
                                {invitingEmail === broker.email ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <Mail className="mr-1 h-3 w-3" />
                                )}
                                Invite
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => setDeleteBrokerTarget(broker)}
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Reviews</CardTitle>
              <CardDescription>
                Verify or reject broker-contributed compliance data
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Contributed By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-slate-500 py-8">
                        No items pending review.
                      </TableCell>
                    </TableRow>
                  )}
                  {complianceItems.map((item) => (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell>
                        <Badge variant="secondary">
                          {item.type === "requirement" ? "Requirement" : "Limit"}
                        </Badge>
                      </TableCell>
                      <TableCell>{COUNTRY_LABELS[item.country] || item.country}</TableCell>
                      <TableCell>
                        {BENEFIT_CATEGORY_LABELS[item.category] || item.category}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.description}
                      </TableCell>
                      <TableCell>{item.contributedBy}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                            onClick={() => verifyComplianceItem(item.type, item.id)}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => rejectComplianceItem(item.type, item.id)}
                          >
                            <XCircle className="mr-1 h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coverage">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Coverage Report</CardTitle>
              <CardDescription>
                Requirements and statutory limits coverage by country. Total: {totalCoverageData} items across {coverage.filter((c) => c.requirements > 0 || c.limits > 0).length} countries.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-center">Requirements</TableHead>
                    <TableHead className="text-center">Verified</TableHead>
                    <TableHead className="text-center">Limits</TableHead>
                    <TableHead className="text-center">Verified</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coverage.map((c) => (
                    <TableRow key={c.country}>
                      <TableCell className="font-medium">
                        {c.countryName} ({c.country})
                      </TableCell>
                      <TableCell className="text-center">{c.requirements}</TableCell>
                      <TableCell className="text-center">
                        {c.requirementsVerified > 0 && (
                          <Badge variant="success">{c.requirementsVerified}</Badge>
                        )}
                        {c.requirements > 0 && c.requirementsVerified === 0 && (
                          <Badge variant="warning">0</Badge>
                        )}
                        {c.requirements === 0 && (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{c.limits}</TableCell>
                      <TableCell className="text-center">
                        {c.limitsVerified > 0 && (
                          <Badge variant="success">{c.limitsVerified}</Badge>
                        )}
                        {c.limits > 0 && c.limitsVerified === 0 && (
                          <Badge variant="warning">0</Badge>
                        )}
                        {c.limits === 0 && (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {c.requirements + c.limits}
                      </TableCell>
                      <TableCell>
                        {(c.requirements + c.limits) > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rerunComplianceForCountry(c.country)}
                            disabled={rerunning === c.country}
                          >
                            {rerunning === c.country ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-1 h-3 w-3" />
                            )}
                            Re-run
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Client Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              {deleteTarget?.company?.name} ({deleteTarget?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <input
                type="radio"
                name="deleteMode"
                checked={deleteMode === "anonymize"}
                onChange={() => setDeleteMode("anonymize")}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-sm">Remove personal data only</div>
                <div className="text-xs text-slate-500">
                  Keep anonymized benefits data for benchmarking
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <input
                type="radio"
                name="deleteMode"
                checked={deleteMode === "full"}
                onChange={() => setDeleteMode("full")}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-sm">Delete all data permanently</div>
                <div className="text-xs text-slate-500">
                  Remove company, benefits, and all associated data
                </div>
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteMode === "anonymize" ? "Anonymize" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Contact Dialog */}
      <Dialog open={!!replaceTarget} onOpenChange={(open) => !open && setReplaceTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Contact</DialogTitle>
            <DialogDescription>
              Replace the contact person for {replaceTarget?.company?.name}.
              The new user will sign in via magic link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="replace-name">Name</Label>
              <Input
                id="replace-name"
                placeholder="Full name"
                value={replaceName}
                onChange={(e) => setReplaceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="replace-email">Email</Label>
              <Input
                id="replace-email"
                type="email"
                placeholder="email@company.com"
                value={replaceEmail}
                onChange={(e) => setReplaceEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReplaceContact}
              disabled={replacing || !replaceName.trim() || !replaceEmail.trim()}
            >
              {replacing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Replace Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Client Dialog */}
      <Dialog open={showCreateClient} onOpenChange={setShowCreateClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Client</DialogTitle>
            <DialogDescription>
              Create a new company and its first user (Owner).
              The user will sign in via magic link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-company">Company Name</Label>
              <Input
                id="create-company"
                placeholder="Acme Corp"
                value={createCompanyName}
                onChange={(e) => setCreateCompanyName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-country">Country (ISO code)</Label>
                <Input
                  id="create-country"
                  placeholder="IE"
                  maxLength={2}
                  value={createCountry}
                  onChange={(e) => setCreateCountry(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-employees">Employee Count</Label>
                <Input
                  id="create-employees"
                  type="number"
                  placeholder="100"
                  value={createEmployeeCount}
                  onChange={(e) => setCreateEmployeeCount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-industry">Industry (NACE code)</Label>
              <Input
                id="create-industry"
                placeholder="K64"
                value={createIndustry}
                onChange={(e) => setCreateIndustry(e.target.value)}
              />
            </div>
            <hr />
            <div className="space-y-2">
              <Label htmlFor="create-user-name">Contact Name</Label>
              <Input
                id="create-user-name"
                placeholder="Jane Smith"
                value={createUserName}
                onChange={(e) => setCreateUserName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-user-email">Contact Email</Label>
              <Input
                id="create-user-email"
                type="email"
                placeholder="jane@acme.com"
                value={createUserEmail}
                onChange={(e) => setCreateUserEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateClient(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateClient}
              disabled={
                creating ||
                !createCompanyName.trim() ||
                !createCountry.trim() ||
                !createIndustry.trim() ||
                !createEmployeeCount.trim() ||
                !createUserName.trim() ||
                !createUserEmail.trim()
              }
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={!!addUserTarget} onOpenChange={(open) => !open && setAddUserTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Add a new user to {addUserTarget?.company?.name}.
              They will sign in via magic link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-user-name">Name</Label>
              <Input
                id="add-user-name"
                placeholder="Full name"
                value={addUserName}
                onChange={(e) => setAddUserName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-user-email">Email</Label>
              <Input
                id="add-user-email"
                type="email"
                placeholder="email@company.com"
                value={addUserEmail}
                onChange={(e) => setAddUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-user-role">Role</Label>
              <Select value={addUserRole} onValueChange={(v) => setAddUserRole(v as "OWNER" | "CONTRIBUTOR" | "VIEWER")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Owner - Full access, manage users</SelectItem>
                  <SelectItem value="CONTRIBUTOR">Contributor - Edit survey data</SelectItem>
                  <SelectItem value="VIEWER">Viewer - Read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={addingUser || !addUserName.trim() || !addUserEmail.trim()}
            >
              {addingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Broker Dialog */}
      <Dialog open={!!editBroker} onOpenChange={(open) => !open && setEditBroker(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Broker</DialogTitle>
            <DialogDescription>
              Update broker account details for {editBroker?.brokerProfile?.companyName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-broker-name">Name</Label>
              <Input
                id="edit-broker-name"
                value={editBrokerName}
                onChange={(e) => setEditBrokerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-broker-email">Email</Label>
              <Input
                id="edit-broker-email"
                type="email"
                value={editBrokerEmail}
                onChange={(e) => setEditBrokerEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-broker-company">Firm Name</Label>
              <Input
                id="edit-broker-company"
                value={editBrokerCompany}
                onChange={(e) => setEditBrokerCompany(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-broker-license">License Number</Label>
              <Input
                id="edit-broker-license"
                placeholder="Optional"
                value={editBrokerLicense}
                onChange={(e) => setEditBrokerLicense(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-broker-countries">Countries Active</Label>
              <Input
                id="edit-broker-countries"
                placeholder="IE, GB, FR"
                value={editBrokerCountries}
                onChange={(e) => setEditBrokerCountries(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBroker(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditBroker}
              disabled={
                editingBroker ||
                !editBrokerName.trim() ||
                !editBrokerEmail.trim() ||
                !editBrokerCompany.trim() ||
                !editBrokerCountries.trim()
              }
            >
              {editingBroker && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Broker Dialog */}
      <Dialog open={!!deleteBrokerTarget} onOpenChange={(open) => !open && setDeleteBrokerTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Broker</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteBrokerTarget?.name ?? deleteBrokerTarget?.email}
              {deleteBrokerTarget?.brokerProfile?.companyName
                ? ` from ${deleteBrokerTarget.brokerProfile.companyName}`
                : ""}
              ? This will permanently remove their account and all broker-client relationships.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBrokerTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBroker}
              disabled={deletingBroker}
            >
              {deletingBroker && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Broker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Broker User Dialog */}
      <Dialog open={!!addBrokerUserTarget} onOpenChange={(open) => !open && setAddBrokerUserTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User to Broker Firm</DialogTitle>
            <DialogDescription>
              Add a new user to {addBrokerUserTarget?.brokerProfile?.companyName}.
              They will share the same firm details and countries.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-broker-user-name">Name</Label>
              <Input
                id="add-broker-user-name"
                placeholder="Full name"
                value={addBrokerUserName}
                onChange={(e) => setAddBrokerUserName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-broker-user-email">Email</Label>
              <Input
                id="add-broker-user-email"
                type="email"
                placeholder="user@firm.com"
                value={addBrokerUserEmail}
                onChange={(e) => setAddBrokerUserEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBrokerUserTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddBrokerUser}
              disabled={addingBrokerUser || !addBrokerUserName.trim() || !addBrokerUserEmail.trim()}
            >
              {addingBrokerUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Broker Dialog */}
      <Dialog open={showCreateBroker} onOpenChange={setShowCreateBroker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Broker</DialogTitle>
            <DialogDescription>
              Create a new broker account. They will be auto-approved and
              receive an invite email to sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="broker-name">Name</Label>
              <Input
                id="broker-name"
                placeholder="Full name"
                value={createBrokerName}
                onChange={(e) => setCreateBrokerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="broker-email">Email</Label>
              <Input
                id="broker-email"
                type="email"
                placeholder="broker@firm.com"
                value={createBrokerEmail}
                onChange={(e) => setCreateBrokerEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="broker-company">Firm Name</Label>
              <Input
                id="broker-company"
                placeholder="Broker Firm Ltd"
                value={createBrokerCompany}
                onChange={(e) => setCreateBrokerCompany(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="broker-license">License Number</Label>
              <Input
                id="broker-license"
                placeholder="Optional"
                value={createBrokerLicense}
                onChange={(e) => setCreateBrokerLicense(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="broker-countries">Countries Active</Label>
              <Input
                id="broker-countries"
                placeholder="IE, GB, FR"
                value={createBrokerCountries}
                onChange={(e) => setCreateBrokerCountries(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateBroker(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateBroker}
              disabled={
                creatingBroker ||
                !createBrokerName.trim() ||
                !createBrokerEmail.trim() ||
                !createBrokerCompany.trim() ||
                !createBrokerCountries.trim()
              }
            >
              {creatingBroker && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Broker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
