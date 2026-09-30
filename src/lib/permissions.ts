import { ROLES } from "./constants";

type Action = "create" | "read" | "update" | "delete";

const permissions: Record<string, string[]> = {
  [ROLES.SUPER_ADMIN]: ["*"],
  [ROLES.ADMIN]: ["read:user", "create:enrollment", "read:enrollment", "update:enrollment",
    "create:attendance", "read:attendance", "update:attendance",
    "read:course", "read:classgroup",
    "read:payment", "update:payment",
    "read:report",
    "read:certificate", "create:certificate",
    "read:notification",
  ],
  [ROLES.TEACHER]: ["create:attendance", "read:attendance", "update:attendance",
    "create:grade", "read:grade", "update:grade",
    "read:classgroup", "read:student",
    "read:schedule",
    "read:notification",
  ],
  [ROLES.STUDENT]: ["read:course", "read:classgroup", "read:schedule",
    "read:attendance", "read:grade", "read:certificate", "download:certificate",
    "read:payment", "read:notification",
  ],
  [ROLES.PARENT]: ["read:student", "read:attendance", "read:grade",
    "read:schedule", "read:notification",
  ],
};

export function hasPermission(role: string, action: string): boolean {
  if (permissions[role]?.includes("*")) return true;
  return permissions[role]?.includes(action) ?? false;
}

export function filterScope<T extends { teacherId?: string; studentId?: string }>(
  items: T[],
  userRole: string,
  userId: string
): T[] {
  if (userRole === ROLES.SUPER_ADMIN) return items;
  if (userRole === ROLES.TEACHER) return items.filter(i => "teacherId" in i && i.teacherId === userId);
  return items;
}
