link"
                                   size="sm"
                                   onClick={() => setPropertyCache(new Map())}
                                   className="mt-2"
                                 >
                                   Clear cached results
                                 </Button>
                               )}
                             </div>
                           )}
                         </div>
                       ) : (
                         filteredAndPaginatedProperties.properties.map((property) => (
                          <div key={property.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                            <Checkbox
                              checked={selectedProperties.some(p => p.id === property.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedProperties(prev => [...prev, property]);
                                } else {
                                  setSelectedProperties(prev => prev.filter(p => p.id !== property.id));
                                }
                              }}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{property.property_name}</div>
                              <div className="text-sm text-gray-600">
                                {property.address}, {property.city}, {property.state}
                              </div>
                              <div className="text-xs text-gray-500">
                                PM: {property.property_manager_name || 'Not assigned'} • Last Inspection: {property.last_inspection_date || 'Never'}
                              </div>
                            </div>
                             <div className="text-right">
                               <div className="text-sm font-medium">{property.roof_area?.toLocaleString() || 'N/A'} sq ft</div>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="grouping" className="flex-1 min-h-0">
            <IntelligentGrouping
              properties={filteredProperties}
              selectedProperties={selectedProperties}
              onGroupsGenerated={setGeneratedGroups}
              onPropertiesSelected={setSelectedProperties}
            />
          </TabsContent>
        </Tabs>

        {/* Workflow Progress Section */}
        {workflowLoading && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {currentStep === WorkflowSteps.PREPARING && "Preparing campaign..."}
                  {currentStep === WorkflowSteps.VALIDATING && "Validating data..."}
                  {currentStep === WorkflowSteps.SENDING && "Sending to n8n..."}
                  {currentStep === WorkflowSteps.PROCESSING && "Processing workflow..."}
                  {currentStep === WorkflowSteps.COMPLETE && "Campaign started successfully!"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelWorkflow}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Progress value={progress} className="w-full" />
              {retryAttempt > 0 && (
                <div className="text-xs text-gray-600">
                  Retry attempt {retryAttempt}/{webhookConfig.retryAttempts}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Success State */}
        {campaignResult && currentStep === WorkflowSteps.COMPLETE && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Campaign Created Successfully!</span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <div>Market: {campaignResult.market}</div>
                <div>Properties: {campaignResult.propertyCount}</div>
                <div>Property Manager: {campaignResult.propertyManager}</div>
                {campaignResult.estimatedCompletion && (
                  <div>Estimated Completion: {campaignResult.estimatedCompletion}</div>
                )}
              </div>
              <div className="flex space-x-2">
                {campaignResult.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={viewCampaignStatus}
                    className="text-green-700 border-green-300"
                  >
                    View Campaign Status
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={scheduleAnotherCampaign}
                  className="text-green-700 border-green-300"
                >
                  Schedule Another Campaign
                </Button>
              </div>
            </div>
          </Card>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={exportSelectedProperties}>
              <FileDown className="h-4 w-4 mr-2" />
              Export List
            </Button>
          </div>
          <Button 
            onClick={initiateInspectionWorkflow}
            disabled={
              selectedProperties.length === 0 || 
              workflowLoading || 
              !isOnline ||
              !validateWebhookUrl(webhookConfig.url) ||
              currentStep === WorkflowSteps.COMPLETE
            }
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {workflowLoading ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                {currentStep === WorkflowSteps.PREPARING && "Preparing..."}
                {currentStep === WorkflowSteps.VALIDATING && "Validating..."}
                {currentStep === WorkflowSteps.SENDING && "Sending..."}
                {currentStep === WorkflowSteps.PROCESSING && "Processing..."}
              </>
            ) : currentStep === WorkflowSteps.COMPLETE ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Campaign Started
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Start Inspection Workflow ({selectedProperties.length} properties)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
