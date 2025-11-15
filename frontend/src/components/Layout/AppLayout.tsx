import { AppShell, Burger, Group, NavLink, Title, Avatar, Menu, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  IconDashboard,
  IconSettings,
  IconLogout,
  IconUser,
  IconChartBar,
} from '@tabler/icons-react';
import { useAuthStore } from '@/store/auth.store';

export function AppLayout() {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const navItems = [
    { icon: IconDashboard, label: 'Dashboard', path: '/' },
    { icon: IconSettings, label: 'Settings', path: '/settings' },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <IconChartBar size={32} />
            <Title order={3}>Capabilities Platform</Title>
          </Group>

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Avatar style={{ cursor: 'pointer' }} color="blue" radius="xl">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>{user?.email}</Menu.Label>
              <Menu.Item leftSection={<IconUser size={14} />} onClick={() => navigate('/profile')}>
                Profile
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconLogout size={14} />}
                color="red"
                onClick={logout}
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Text size="xs" c="dimmed" mb="md" tt="uppercase" fw={700}>
          Navigation
        </Text>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            label={item.label}
            leftSection={<item.icon size={20} />}
            active={location.pathname === item.path}
            onClick={() => {
              navigate(item.path);
              if (opened) toggle();
            }}
            mb="xs"
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
