import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle,
  X,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

interface CriticalAlert {
  id: string;
  property: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  inspector: string;
  timestamp: Date;
  description?: string;
  location?: string;
  estimatedCost?: number;
  photos?: string[];
  status?: 'active' | 'acknowledged' | 'resolved';
}

interface CriticalIssueAlertCenterProps {
  alerts: CriticalAlert[];
  onAlertUpdate: () => void;
}

export function CriticalIssueAlertCenter({ alerts, onAlertUpdate }: CriticalIssueAlertCenterProps) {
  const [selectedAlert, setSelectedAlert] = useState<CriticalAlert | null>(null);
  const [processingAlert, setProcessingAlert] = useState<string | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return '🔵';
      default: return 'ℹ️';
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    setProcessingAlert(alertId);
    try {
      // TODO: Implement API call to acknowledge alert
      await new Promise(resolve => setTimeout(resolve, 1000));
      onAlertUpdate();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    } finally {
      setProcessingAlert(null);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    setProcessingAlert(alertId);
    try {
      // TODO: Implement API call to resolve alert
      await new Promise(resolve => setTimeout(resolve, 1000));
      onAlertUpdate();
    } catch (error) {
      console.error('Error resolving alert:', error);
    } finally {
      setProcessingAlert(null);
    }
  };

  const handleContactInspector = (inspector: string) => {
    // TODO: Implement inspector contact functionality
    console.log('Contacting inspector:', inspector);
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
            <p className="text-gray-600">No critical issues requiring immediate attention.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Critical Issue Alert Center</h2>
          <p className="text-muted-foreground">
            Monitor and respond to critical issues requiring immediate attention
          </p>
        </div>
        <Badge variant="destructive" className="text-sm">
          {alerts.length} Critical Alert{alerts.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Active Alerts */}
      <div className="grid gap-4">
        {alerts.map((alert) => (
          <Card key={alert.id} className={`border-l-4 ${getSeverityColor(alert.severity)} transition-all hover:shadow-md`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Alert Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">{getSeverityIcon(alert.severity)}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {alert.property}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{alert.issue}</p>
                    </div>
                    <Badge variant={
                      alert.severity === 'high' ? 'destructive' : 
                      alert.severity === 'medium' ? 'default' : 
                      'secondary'
                    }>
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Alert Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>Inspector: {alert.inspector}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Reported: {format(alert.timestamp, 'MMM dd, HH:mm')}</span>
                    </div>
                    {alert.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>Location: {alert.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {alert.description && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{alert.description}</p>
                    </div>
                  )}

                  {/* Estimated Cost */}
                  {alert.estimatedCost && (
                    <div className="mt-3">
                      <Badge variant="outline" className="text-sm">
                        Estimated Cost: ${alert.estimatedCost.toLocaleString()}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleContactInspector(alert.inspector)}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Contact
                  </Button>
                  
                  {alert.status !== 'acknowledged' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      disabled={processingAlert === alert.id}
                      className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                    >
                      {processingAlert === alert.id ? 'Processing...' : 'Acknowledge'}
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolveAlert(alert.id)}
                    disabled={processingAlert === alert.id}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {processingAlert === alert.id ? 'Processing...' : 'Resolve'}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Emergency Response Guidelines */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Emergency Response Protocol
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-orange-700">
            <p>🚨 <strong>High Severity:</strong> Contact property manager within 15 minutes</p>
            <p>⚠️ <strong>Medium Severity:</strong> Follow up within 2 hours</p>
            <p>🔵 <strong>Low Severity:</strong> Address within 24 hours</p>
          </div>
        </CardContent>
      </Card>

      {/* Alert Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {alerts.filter(a => a.severity === 'high').length}
              </div>
              <p className="text-sm text-muted-foreground">High Severity</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {alerts.filter(a => a.severity === 'medium').length}
              </div>
              <p className="text-sm text-muted-foreground">Medium Severity</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {alerts.filter(a => a.severity === 'low').length}
              </div>
              <p className="text-sm text-muted-foreground">Low Severity</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}