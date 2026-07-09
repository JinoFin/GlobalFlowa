import { AdminLoginForm } from "@/components/admin/login-form";

export const metadata = {
  title: "Admin Login",
};

export default function AdminLoginPage() {
  return (
    <div className="bg-navy-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-md border border-navy-100 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-navy-950">
          Login to Globalflowa
        </h1>
        <p className="mt-3 text-sm leading-6 text-navy-650">
          Admin access uses Supabase Auth. Create an admin user in Supabase and
          add a matching row in the profiles table.
        </p>
        <div className="mt-8">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
