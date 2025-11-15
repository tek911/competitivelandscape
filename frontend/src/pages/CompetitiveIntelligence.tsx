import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Group,
  Button,
  Stack,
  Paper,
  Badge,
  Tooltip,
  Table,
  Loader,
  Center,
  Avatar,
  ScrollArea,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconDownload } from '@tabler/icons-react';
import { productSpaceService } from '@/services/productSpace.service';
import { exportService } from '@/services/export.service';
import { notifications } from '@mantine/notifications';

const getSentimentColor = (label?: string) => {
  switch (label) {
    case 'POSITIVE':
      return 'green';
    case 'NEUTRAL':
      return 'blue';
    case 'NEGATIVE':
      return 'red';
    case 'MISLEADING':
      return 'red';
    case 'VAGUE':
      return 'yellow';
    case 'MISSING':
      return 'gray';
    default:
      return 'gray';
  }
};

export function CompetitiveIntelligence() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['competitiveIntelligence', id],
    queryFn: () => productSpaceService.getCompetitiveIntelligence(id!),
    enabled: !!id,
  });

  const handleExport = async () => {
    if (!id) return;

    setExporting(true);
    try {
      const blob = await exportService.exportMatrix(id, {
        format: 'excel',
        includeMetadata: true,
        includeSentiment: true,
      });
      exportService.downloadFile(blob, `competitive-intelligence-${Date.now()}.xlsx`);
      notifications.show({
        title: 'Success',
        message: 'Exported successfully',
        color: 'green',
      });
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!data) {
    return (
      <Center h={400}>
        <Text>Data not found</Text>
      </Center>
    );
  }

  return (
    <Container size="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <div>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate(`/product-spaces/${id}`)}
              mb="md"
            >
              Back to Product Space
            </Button>
            <Title order={1}>{data.productSpace.name}</Title>
            <Text c="dimmed">Competitive Intelligence Matrix</Text>
          </div>
          <Button
            leftSection={<IconDownload size={16} />}
            onClick={handleExport}
            loading={exporting}
          >
            Export Matrix
          </Button>
        </Group>

        <Paper shadow="sm" p="md" withBorder>
          <ScrollArea>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ minWidth: 200 }}>Capability</Table.Th>
                  {data.vendors.map((vendor) => (
                    <Table.Th key={vendor.id} style={{ minWidth: 200 }}>
                      <Group gap="xs">
                        {vendor.logoUrl ? (
                          <Avatar src={vendor.logoUrl} size="sm" radius="sm" />
                        ) : (
                          <Avatar size="sm" radius="sm">
                            {vendor.name.charAt(0)}
                          </Avatar>
                        )}
                        <div>
                          <Text size="sm" fw={500}>
                            {vendor.name}
                          </Text>
                          {vendor.website && (
                            <Text size="xs" c="dimmed">
                              {vendor.website}
                            </Text>
                          )}
                        </div>
                      </Group>
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.matrix.map((row) => (
                  <Table.Tr key={row.capabilityId}>
                    <Table.Td>
                      <div>
                        <Group gap="xs">
                          <Text size="sm" fw={500}>
                            {row.name}
                          </Text>
                          <Badge
                            size="xs"
                            color={
                              row.importanceLevel === 'CRITICAL'
                                ? 'red'
                                : row.importanceLevel === 'HIGH'
                                ? 'orange'
                                : row.importanceLevel === 'MEDIUM'
                                ? 'blue'
                                : 'gray'
                            }
                          >
                            {row.importanceLevel}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {row.category}
                        </Text>
                      </div>
                    </Table.Td>
                    {data.vendors.map((vendor) => {
                      const response = row.responses[vendor.id];
                      return (
                        <Table.Td key={vendor.id}>
                          {response ? (
                            <Tooltip
                              label={
                                <div>
                                  <Text size="xs" fw={500} mb={4}>
                                    {response.sentimentLabel || 'Not analyzed'}
                                  </Text>
                                  {response.sentimentAnalysis && (
                                    <Text size="xs">{response.sentimentAnalysis}</Text>
                                  )}
                                </div>
                              }
                              multiline
                              w={300}
                            >
                              <Paper
                                p="xs"
                                withBorder
                                style={{
                                  borderColor: `var(--mantine-color-${getSentimentColor(
                                    response.sentimentLabel
                                  )}-5)`,
                                  borderWidth: 2,
                                  cursor: 'help',
                                }}
                              >
                                <Text size="sm" lineClamp={3}>
                                  {response.responseText}
                                </Text>
                                {response.sentimentLabel && (
                                  <Badge
                                    size="xs"
                                    color={getSentimentColor(response.sentimentLabel)}
                                    mt="xs"
                                  >
                                    {response.sentimentLabel}
                                  </Badge>
                                )}
                              </Paper>
                            </Tooltip>
                          ) : (
                            <Badge color="gray" variant="light">
                              No Response
                            </Badge>
                          )}
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>

        <Paper shadow="sm" p="md" withBorder>
          <Title order={3} mb="md">
            Sentiment Legend
          </Title>
          <Group>
            <Badge color="green">POSITIVE</Badge>
            <Badge color="blue">NEUTRAL</Badge>
            <Badge color="red">NEGATIVE</Badge>
            <Badge color="red">MISLEADING</Badge>
            <Badge color="yellow">VAGUE</Badge>
            <Badge color="gray">MISSING</Badge>
          </Group>
        </Paper>
      </Stack>
    </Container>
  );
}
