import { useState } from 'react';
import {
  Container,
  Title,
  Grid,
  Card,
  Text,
  Button,
  Group,
  Badge,
  Stack,
  Modal,
  TextInput,
  Textarea,
  Loader,
  Center,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconUpload, IconChartBar } from '@tabler/icons-react';
import { productSpaceService } from '@/services/productSpace.service';
import { documentService } from '@/services/document.service';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';

export function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [uploadOpened, { open: openUpload, close: closeUpload }] = useDisclosure(false);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['productSpaces'],
    queryFn: () => productSpaceService.getAll(),
  });

  const createForm = useForm({
    initialValues: {
      name: '',
      description: '',
      industry: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: productSpaceService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productSpaces'] });
      notifications.show({
        title: 'Success',
        message: 'Product space created successfully',
        color: 'green',
      });
      closeCreate();
      createForm.reset();
    },
  });

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      const result = await documentService.upload(files[0]);
      notifications.show({
        title: 'Success',
        message: `Uploaded: ${result.stats.capabilities} capabilities, ${result.stats.vendors} vendors`,
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['productSpaces'] });
      closeUpload();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Product Spaces</Title>
        <Group>
          <Button leftSection={<IconUpload size={16} />} onClick={openUpload}>
            Upload Document
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Create Product Space
          </Button>
        </Group>
      </Group>

      <Grid>
        {data?.data.map((space) => (
          <Grid.Col key={space.id} span={{ base: 12, md: 6, lg: 4 }}>
            <Card
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{ cursor: 'pointer', height: '100%' }}
              onClick={() => navigate(`/product-spaces/${space.id}`)}
            >
              <Stack gap="md">
                <Group justify="space-between">
                  <IconChartBar size={32} />
                  {space.industry && <Badge>{space.industry}</Badge>}
                </Group>

                <div>
                  <Title order={3}>{space.name}</Title>
                  {space.description && (
                    <Text size="sm" c="dimmed" lineClamp={2} mt="xs">
                      {space.description}
                    </Text>
                  )}
                </div>

                <Group gap="xl">
                  <div>
                    <Text size="xs" c="dimmed">
                      Capabilities
                    </Text>
                    <Text size="lg" fw={700}>
                      {space._count?.capabilities || 0}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      Vendors
                    </Text>
                    <Text size="lg" fw={700}>
                      {space.vendorCount || 0}
                    </Text>
                  </div>
                </Group>

                <Button
                  variant="light"
                  fullWidth
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/product-spaces/${space.id}/competitive-intelligence`);
                  }}
                >
                  View Intelligence
                </Button>
              </Stack>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {data?.data.length === 0 && (
        <Center h={300}>
          <Stack align="center">
            <Text size="xl" c="dimmed">
              No product spaces yet
            </Text>
            <Button leftSection={<IconUpload size={16} />} onClick={openUpload}>
              Upload Your First Document
            </Button>
          </Stack>
        </Center>
      )}

      <Modal opened={createOpened} onClose={closeCreate} title="Create Product Space">
        <form onSubmit={createForm.onSubmit((values) => createMutation.mutate(values))}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="Product Space Name"
              required
              {...createForm.getInputProps('name')}
            />
            <Textarea
              label="Description"
              placeholder="Description"
              {...createForm.getInputProps('description')}
            />
            <TextInput
              label="Industry"
              placeholder="e.g., Healthcare, Finance"
              {...createForm.getInputProps('industry')}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeCreate}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={uploadOpened} onClose={closeUpload} title="Upload Document">
        <Stack>
          <Dropzone
            onDrop={handleFileUpload}
            loading={uploading}
            accept={[MIME_TYPES.xlsx, MIME_TYPES.xls, MIME_TYPES.csv]}
            maxSize={10 * 1024 * 1024}
          >
            <Stack align="center" gap="md" mih={120} style={{ pointerEvents: 'none' }}>
              <IconUpload size={50} />
              <div>
                <Text size="lg" inline>
                  Drag Excel or CSV file here or click to select
                </Text>
                <Text size="sm" c="dimmed" inline mt={7}>
                  File should not exceed 10MB
                </Text>
              </div>
            </Stack>
          </Dropzone>
        </Stack>
      </Modal>
    </Container>
  );
}
