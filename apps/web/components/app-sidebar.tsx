"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@uberskills/ui";
import {
  BookOpenIcon,
  BugIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ExternalLinkIcon,
  GithubIcon,
  LibraryIcon,
  SettingsIcon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/skills", label: "Skills", icon: LibraryIcon },
  { href: "/import", label: "Import", icon: UploadIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

const linkItems = [
  {
    href: "https://github.com/heldervasc/uberskills",
    label: "GitHub",
    icon: GithubIcon,
  },
  {
    href: "https://github.com/heldervasc/uberskills/issues/new",
    label: "Open an Issue",
    icon: BugIcon,
  },
  {
    href: "https://docs.anthropic.com/en/docs/claude-code/skills",
    label: "Skills Docs",
    icon: BookOpenIcon,
  },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/" className="flex flex-col items-center gap-0.5 px-2 py-3">
          <span className="truncate text-xl font-bold tracking-tight">
            {isCollapsed ? "U" : "UberSkills"}
          </span>
          {!isCollapsed && <span className="text-xs text-muted-foreground">v0.0.0</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarSeparator className="mx-0" />
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                      <Link href={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Links</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {linkItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild tooltip={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      <Icon />
                      <span className="flex flex-1 items-center justify-between">
                        {label}
                        <ExternalLinkIcon className="size-3 text-muted-foreground" />
                      </span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleSidebar} tooltip="Collapse sidebar">
              {isCollapsed ? <ChevronsRightIcon /> : <ChevronsLeftIcon />}
              <span>Collapse</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
