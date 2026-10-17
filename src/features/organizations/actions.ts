"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth";
import {
  organizationSchema,
  invalidInput,
  type FormState,
} from "@/lib/validation";
import { publicSupabaseEnv } from "@/lib/env";
export async function createOrganization(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = organizationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalidInput(parsed.error);
  if (!publicSupabaseEnv())
    return {
      status: "error",
      message: "Connect Supabase before creating an organization.",
    };
  const { supabase } = await requireAccount();
  let id: string;
  try {
    const { data, error } = await supabase.rpc("create_organization", {
      organization_name: parsed.data.name,
      organization_slug: parsed.data.slug,
    });
    if (error || !data)
      return {
        status: "error",
        message:
          error?.code === "23505"
            ? "This organization address is already in use. Choose another."
            : "Could not create the organization. Please try again.",
      };
    id = data;
  } catch {
    return {
      status: "error",
      message: "We could not connect. Please try again.",
    };
  }
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/organizations/${id}`);
}
