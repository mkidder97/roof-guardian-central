import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Database, Zap, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PerformanceMetric {
  query_type: string;
  avg_execution_time: number;
  total_queries: number;
  error_count: number;
}

interface DatabaseStats {
  total_properties: number;
  indexed_fields: string[];
  cache_hit_rate: number;
  slow_queries: number;
}

export function DatabasePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformanceData();
    const interval = setInterval(fetchPerformanceData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPerformanceData = async () => {
    try {
      // Fetch query performance metrics
      const { data: perfData, error: perfError } = await supabase
        .from('query_performance_log')
        .select('query_type, execution_time_ms')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (perfError) throw perfError;

      // Aggregate metrics
      const aggregated = perfData?.reduce((acc, curr) => {
        const existing = acc.find(m => m.query_type === curr.query_type);
        if (existing) {
          existing.total_queries++;
          existing.avg_execution_time = 
            (existing.avg_execution_time * (existing.total_queries - 1) + curr.execution_time_ms) / 
            existing.total_queries;
          if (curr.execution_time_ms > 1000) { // Consider > 1s as slow
            existing.error_count++;
          }
        } else {
          acc.push({
            query_type: curr.query_type,
            avg_execution_time: curr.execution_time_ms,
            total_queries: 1,
            error_count: curr.execution_time_ms > 1000 ? 1 : 0
          });
        }
        return acc;
      }, [] as PerformanceMetric[]) || [];

      setMetrics(aggregated);

      // Fetch database stats
      const { count: propertyCount } = await supabase
        .from('roofs')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false);

      // Calculate cache hit rate from performance logs
      const cacheHitRate = aggregated.reduce((acc, m) => {
        if (m.query_type.includes('cache')) {
          return acc + (m.total_queries / aggregated.reduce((sum, metric) => sum + metric.total_queries, 0));
        }
        return acc;
      }, 0) * 100;

      setStats({
        total_properties: propertyCount || 0,
        indexed_fields: ['region', 'market', 'zip', 'status', 'property_manager_name'],
        cache_hit_rate: cacheHitRate,
        slow_queries: aggregated.reduce((sum, m) => sum + m.error_count, 0)
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError('Failed to load performance metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading performance metrics...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_properties || 0}</div>
            <p className="text-xs text-muted-foreground">Active in database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Query Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.length > 0 
                ? Math.round(metrics.reduce((sum, m) => sum + m.avg_execution_time, 0) / metrics.length)
                : 0}ms
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats?.cache_hit_rate || 0)}%</div>
            <p className="text-xs text-muted-foreground">Query cache efficiency</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slow Queries</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.slow_queries || 0}</div>
            <p className="text-xs text-muted-foreground">Queries >1s</p>
          </CardContent>
        </Card>
      </div>

      {/* Query Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Query Performance by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="query_type" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avg_execution_time" fill="#8884d8" name="Avg Time (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Indexed Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Optimized Fields</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats?.indexed_fields.map(field => (
              <div
                key={field}
                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {field}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            These fields have database indexes for optimal filtering performance
          </p>
        </CardContent>
      </Card>

      {/* Performance Tips */}
      {stats && stats.slow_queries > 10 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Performance Alert:</strong> {stats.slow_queries} slow queries detected in the last 24 hours.
            Consider using the filter cache more effectively or optimizing complex queries.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}