import { useState } from 'react';
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Container,
  Stack,
  Tabs,
  Center,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { IconChartBar } from '@tabler/icons-react';

export function Login() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('login');

  const loginForm = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length >= 6 ? null : 'Password must be at least 6 characters'),
    },
  });

  const registerForm = useForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
    },
    validate: {
      name: (value) => (value.length >= 2 ? null : 'Name must be at least 2 characters'),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length >= 6 ? null : 'Password must be at least 6 characters'),
    },
  });

  const handleLogin = async (values: typeof loginForm.values) => {
    setLoading(true);
    try {
      const response = await authService.login(values);
      setUser(response.user);
      notifications.show({
        title: 'Success',
        message: 'Logged in successfully',
        color: 'green',
      });
      navigate('/');
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: typeof registerForm.values) => {
    setLoading(true);
    try {
      const response = await authService.register(values);
      setUser(response.user);
      notifications.show({
        title: 'Success',
        message: 'Account created successfully',
        color: 'green',
      });
      navigate('/');
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Center mb="xl">
        <IconChartBar size={48} />
      </Center>
      <Title ta="center" mb="md">
        Enterprise Capabilities Platform
      </Title>

      <Paper withBorder shadow="md" p={30} radius="md">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow>
            <Tabs.Tab value="login">Login</Tabs.Tab>
            <Tabs.Tab value="register">Register</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="login" pt="md">
            <form onSubmit={loginForm.onSubmit(handleLogin)}>
              <Stack>
                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  required
                  {...loginForm.getInputProps('email')}
                />
                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  required
                  {...loginForm.getInputProps('password')}
                />
                <Button type="submit" fullWidth loading={loading}>
                  Login
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>

          <Tabs.Panel value="register" pt="md">
            <form onSubmit={registerForm.onSubmit(handleRegister)}>
              <Stack>
                <TextInput
                  label="Name"
                  placeholder="Your name"
                  required
                  {...registerForm.getInputProps('name')}
                />
                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  required
                  {...registerForm.getInputProps('email')}
                />
                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  required
                  {...registerForm.getInputProps('password')}
                />
                <Button type="submit" fullWidth loading={loading}>
                  Register
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
}
