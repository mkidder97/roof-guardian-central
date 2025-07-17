import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Calendar, DollarSign, Home, TrendingUp } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface PropertyAlert {
  property_id: string
  property_name: string
  address: string
  city: string
  state: string
  alert_type: 'high_leaks' | 'warranty_expiring' | 'capital_work_upcoming'
  alert_details: string
  priority: 'high' | 'medium' | 'low'
}

interface AlertSummary {
  total: number
  high_priority: number
  medium_priority: number
  low_priority: number
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState<PropertyAlert[]>([])
  const [summary, setSummary] = useState<AlertSummary>({ total: 0, high_priority: 0, medium_priority: 0, low_priority: 0 })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchPropertiesNeedingAttention()
  }, [])

  const fetchPropertiesNeedingAttention = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('properties-needing-attention')
      
      if (error) {
        console.error('Error fetching alerts:', error)
        toast({
          title: "Error",
          description: "Failed to fetch property alerts",
          variant: "destructive"
        })
      } else if (data?.success) {
        setAlerts(data.alerts || [])
        setSummary(data.summary || { total: 0, high_priority: 0, medium_priority: 0, low_priority: 0 })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Failed to fetch property alerts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'high_leaks': return <AlertTriangle className="h-4 w-4" />
      case 'warranty_expiring': return <Calendar className="h-4 w-4" />
      case 'capital_work_upcoming': return <DollarSign className="h-4 w-4" />
      default: return <Home className="h-4 w-4" />
    }
  }

  const getAlertTypeLabel = (alertType: string) => {
    switch (alertType) {
      case 'high_leaks': return 'High Leaks'
      case 'warranty_expiring': return 'Warranty Expiring'
      case 'capital_work_upcoming': return 'Capital Work Due'
      default: return 'Unknown'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roof Portfolio Command Center</h1>
          <p className="text-muted-foreground">Manage property insights, maintenance budgets, and communication automation</p>
        </div>
        <Button onClick={fetchPropertiesNeedingAttention} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Alerts"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">Properties needing attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.high_priority}</div>
            <p className="text-xs text-muted-foreground">Urgent attention required</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Priority</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{summary.medium_priority}</div>
            <p className="text-xs text-muted-foreground">Plan ahead</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Priority</CardTitle>
            <Home className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{summary.low_priority}</div>
            <p className="text-xs text-muted-foreground">Monitor</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Property Alerts</CardTitle>
          <CardDescription>Properties requiring immediate attention based on leaks, warranties, and capital work</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No properties currently need attention. Great job managing your portfolio!
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <div 
                  key={`${alert.property_id}-${alert.alert_type}-${index}`}
                  className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-1">
                    {getAlertIcon(alert.alert_type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold">{alert.property_name}</h4>
                      <Badge variant={getPriorityBadgeVariant(alert.priority)}>
                        {alert.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {getAlertTypeLabel(alert.alert_type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {alert.address}, {alert.city}, {alert.state}
                    </p>
                    <p className="text-sm">{alert.alert_details}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}