import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Group,
  Button,
  Stack,
  Badge,
  Paper,
  Accordion,
  Loader,
  Center,
  Modal,
} from '@mantine/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import {
  IconChartBar,
  IconRefresh,
  IconDownload,
  IconFileText,
} from '@tabler/icons-react';
import { productSpaceService } from '@/services/productSpace.service';
import { exportService } from '@/services/export.service';

export function ProductSpaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [exportOpened, { open: openExport, close: closeExport }] = useDisclosure(false);
  const [updating, setUpdating] = useState(false);

  const { data: productSpace, isLoading } = useQuery({
    queryKey: ['productSpace', id],
    queryFn: () => productSpaceService.getById(id!),
    enabled: !!id,
  });

  const { data: capabilities = [] } = useQuery({
    queryKey: ['capabilities', id],
    queryFn: () => productSpaceService.getCapabilities(id!),
    enabled: !!id,
  });

  const handleUpdateCapabilities = async () => {
    if (!id) return;

    setUpdating(true);
    try {
      const result = await productSpaceService.updateCapabilities(id);
      notifications.show({
        title: 'AI Analysis Complete',
        message: `Generated ${result.suggestions.length} suggestions`,
        color: 'blue',
      });
      queryClient.invalidateQueries({ queryKey: ['productSpace', id] });
      queryClient.invalidateQueries({ queryKey: ['capabilities', id] });
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setUpdating(false);
    }
  };

  const handleExportMatrix = async () => {
    if (!id) return;

    try {
      const blob = await exportService.exportMatrix(id, {
        format: 'excel',
        includeMetadata: true,
        includeSentiment: true,
      });
      exportService.downloadFile(blob, `capabilities-matrix-${Date.now()}.xlsx`);
      notifications.show({
        title: 'Success',
        message: 'Matrix exported successfully',
        color: 'green',
      });
      closeExport();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const handleExportRFI = async () => {
    if (!id) return;

    try {
      const blob = await exportService.exportRFI(id);
      exportService.downloadFile(blob, `rfi-${Date.now()}.xlsx`);
      notifications.show({
        title: 'Success',
        message: 'RFI exported successfully',
        color: 'green',
      });
      closeExport();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!productSpace) {
    return (
      <Center h={400}>
        <Text>Product space not found</Text>
      </Center>
    );
  }

  const groupedCapabilities = capabilities.reduce((acc, cap) => {
    if (!acc[cap.category]) {
      acc[cap.category] = [];
    }
    acc[cap.category].push(cap);
    return acc;
  }, {} as Record<string, typeof capabilities>);

  return (
    <Container size="xl">
      <Stack gap="xl">
        <Paper shadow="sm" p="xl" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Group mb="xs">
                <IconChartBar size={32} />
                <Title order={1}>{productSpace.name}</Title>
              </Group>
              {productSpace.description && (
                <Text c="dimmed">{productSpace.description}</Text>
              )}
            </div>
            <Group>
              {productSpace.industry && <Badge size="lg">{productSpace.industry}</Badge>}
            </Group>
          </Group>

          <Group>
            <div>
              <Text size="xs" c="dimmed">
                Capabilities
              </Text>
              <Text size="xl" fw={700}>
                {productSpace._count?.capabilities || 0}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                Vendors
              </Text>
              <Text size="xl" fw={700}>
                {productSpace.vendorCount || 0}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                Documents
              </Text>
              <Text size="xl" fw={700}>
                {productSpace._count?.documents || 0}
              </Text>
            </div>
          </Group>
        </Paper>

        <Group>
          <Button
            leftSection={<IconChartBar size={16} />}
            onClick={() => navigate(`/product-spaces/${id}/competitive-intelligence`)}
          >
            View Competitive Intelligence
          </Button>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={handleUpdateCapabilities}
            loading={updating}
          >
            Update Materials (AI)
          </Button>
          <Button
            leftSection={<IconDownload size={16} />}
            variant="outline"
            onClick={openExport}
          >
            Export
          </Button>
        </Group>

        <div>
          <Title order={2} mb="md">
            Capabilities
          </Title>
          <Accordion>
            {Object.entries(groupedCapabilities || {}).map(([category, caps]) => (
              <Accordion.Item key={category} value={category}>
                <Accordion.Control>
                  <Group justify="space-between">
                    <Text fw={500}>{category}</Text>
                    <Badge>{caps.length}</Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    {caps.map((cap) => (
                      <Paper key={cap.id} p="md" withBorder>
                        <Group justify="space-between">
                          <div style={{ flex: 1 }}>
                            <Text fw={500}>{cap.name}</Text>
                            {cap.description && (
                              <Text size="sm" c="dimmed">
                                {cap.description}
                              </Text>
                            )}
                          </div>
                          <Group>
                            <Badge color={
                              cap.importanceLevel === 'CRITICAL' ? 'red' :
                              cap.importanceLevel === 'HIGH' ? 'orange' :
                              cap.importanceLevel === 'MEDIUM' ? 'blue' : 'gray'
                            }>
                              {cap.importanceLevel}
                            </Badge>
                            <Text size="sm" c="dimmed">
                              {cap._count?.vendorResponses || 0} responses
                            </Text>
                          </Group>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      </Stack>

      <Modal opened={exportOpened} onClose={closeExport} title="Export Options">
        <Stack>
          <Button
            leftSection={<IconFileText size={16} />}
            fullWidth
            onClick={handleExportMatrix}
          >
            Export Complete Matrix
          </Button>
          <Button
            leftSection={<IconFileText size={16} />}
            fullWidth
            variant="light"
            onClick={handleExportRFI}
          >
            Generate RFI Template
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
