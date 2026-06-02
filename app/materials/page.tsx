import { redirect } from "next/navigation";

/** M3 `/materials` 保留为 `/pick` 别名 */
export default function MaterialsPage() {
  redirect("/pick");
}
