import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Paper,
  TextInput,
  Button,
  Group,
  Alert,
  Tabs,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconSettings, IconCloud, IconCheck, IconX } from '@tabler/icons-react';
import { settingsService } from '@/services/settings.service';

export function Settings() {
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const { data: bedrockConfig, isLoading } = useQuery({
    queryKey: ['bedrockConfig'],
    queryFn: settingsService.getBedrockConfig,
  });

  const bedrockForm = useForm({
    initialValues: {
      region: '',
      accessKeyId: '',
      secretAccessKey: '',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    },
  });

  const updateBedrockMutation = useMutation({
    mutationFn: settingsService.updateBedrockConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bedrockConfig'] });
      notifications.show({
        title: 'Success',
        message: 'Bedrock configuration updated successfully',
        color: 'green',
      });
      bedrockForm.reset();
    },
  });

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const result = await settingsService.testBedrockConnection();
      setTestResult(result);
      notifications.show({
        title: result.success ? 'Success' : 'Error',
        message: result.message,
        color: result.success ? 'green' : 'red',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Container size="lg">
      <Stack gap="xl">
        <Group>
          <IconSettings size={32} />
          <Title order={1}>Settings</Title>
        </Group>

        <Tabs defaultValue="bedrock">
          <Tabs.List>
            <Tabs.Tab value="bedrock" leftSection={<IconCloud size={16} />}>
              AWS Bedrock
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="bedrock" pt="xl">
            <Paper shadow="sm" p="xl" withBorder>
              <Stack gap="md">
                <div>
                  <Title order={2} mb="xs">
                    AWS Bedrock Configuration
                  </Title>
                  <Text c="dimmed" size="sm">
                    Configure AWS Bedrock for AI-powered sentiment analysis and capability updates
                  </Text>
                </div>

                {bedrockConfig?.configured && (
                  <Alert color="green" icon={<IconCheck size={16} />}>
                    AWS Bedrock is configured and ready to use
                  </Alert>
                )}

                {testResult && (
                  <Alert
                    color={testResult.success ? 'green' : 'red'}
                    icon={testResult.success ? <IconCheck size={16} /> : <IconX size={16} />}
                    onClose={() => setTestResult(null)}
                    withCloseButton
                  >
                    {testResult.message}
                  </Alert>
                )}

                <form onSubmit={bedrockForm.onSubmit((values) => updateBedrockMutation.mutate(values))}>
                  <Stack>
                    <TextInput
                      label="AWS Region"
                      placeholder="us-east-1"
                      required
                      {...bedrockForm.getInputProps('region')}
                    />
                    <TextInput
                      label="Access Key ID"
                      placeholder="Your AWS Access Key ID"
                      required
                      {...bedrockForm.getInputProps('accessKeyId')}
                    />
                    <TextInput
                      label="Secret Access Key"
                      placeholder="Your AWS Secret Access Key"
                      type="password"
                      required
                      {...bedrockForm.getInputProps('secretAccessKey')}
                    />
                    <TextInput
                      label="Model ID"
                      placeholder="anthropic.claude-3-sonnet-20240229-v1:0"
                      {...bedrockForm.getInputProps('modelId')}
                    />

                    <Group justify="flex-end">
                      <Button
                        variant="light"
                        onClick={handleTestConnection}
                        loading={testing}
                        disabled={!bedrockConfig?.configured}
                      >
                        Test Connection
                      </Button>
                      <Button type="submit" loading={updateBedrockMutation.isPending}>
                        Save Configuration
                      </Button>
                    </Group>
                  </Stack>
                </form>
              </Stack>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
