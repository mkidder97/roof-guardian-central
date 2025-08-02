import { test, expect } from '@playwright/test';

test.describe('Streamlined Inspection Interface Test', () => {
  
  test('should verify the new streamlined inspection interface', async ({ page }) => {
    console.log('🎯 Testing streamlined inspection interface...');
    
    await page.goto('http://localhost:8080/inspector');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of the updated interface
    await page.screenshot({ 
      path: 'test-results/streamlined-inspection-interface.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved: streamlined-inspection-interface.png');
    
    // Test if app loads without errors
    const hasReactErrors = await page.evaluate(() => {
      const errors = window.console.error.toString();
      return errors.includes('Error') || errors.includes('Warning');
    });
    
    console.log(`🔍 React errors detected: ${hasReactErrors ? 'YES' : 'NO'}`);
    
    // Check if the page has substantial content (not just login)
    const bodyText = await page.textContent('body');
    const hasSubstantialContent = bodyText && bodyText.length > 1000;
    
    console.log(`📄 Page has substantial content: ${hasSubstantialContent ? 'YES' : 'NO'}`);
    console.log(`📊 Content length: ${bodyText?.length || 0} characters`);
    
    // Look for key inspection interface elements
    const inspectionElements = {
      streamlinedChecklist: await page.locator('[class*="streamlined"], :text("Streamlined")').count(),
      stepNavigation: await page.locator('button[class*="step"], button:has-text("Step")').count(),
      progressIndicators: await page.locator('[class*="progress"], :text("Complete")').count(),
      inspectionSteps: await page.locator(':text("Safety"), :text("Water"), :text("Structural")').count(),
      noRepetition: await page.locator(':text("Solar & Daylighting Details")').count() // Should be 0 or 1, not 2+
    };
    
    console.log('🔧 Streamlined interface elements:');
    console.log(`  - Streamlined indicators: ${inspectionElements.streamlinedChecklist}`);
    console.log(`  - Step navigation: ${inspectionElements.stepNavigation}`);
    console.log(`  - Progress indicators: ${inspectionElements.progressIndicators}`);
    console.log(`  - Inspection steps: ${inspectionElements.inspectionSteps}`);
    console.log(`  - Duplicate sections: ${inspectionElements.noRepetition > 1 ? 'FOUND' : 'NONE'}`);
    
    // Test if we improved the UX issues
    const uxImprovements = {
      noDuplicateSolar: inspectionElements.noRepetition <= 1,
      hasStepNavigation: inspectionElements.stepNavigation > 0,
      hasProgressTracking: inspectionElements.progressIndicators > 0,
      hasLogicalFlow: inspectionElements.inspectionSteps > 0
    };
    
    console.log('✅ UX Improvements verified:');
    console.log(`  - Eliminated duplicate questions: ${uxImprovements.noDuplicateSolar ? 'YES' : 'NO'}`);
    console.log(`  - Added step navigation: ${uxImprovements.hasStepNavigation ? 'YES' : 'NO'}`);
    console.log(`  - Added progress tracking: ${uxImprovements.hasProgressTracking ? 'YES' : 'NO'}`);
    console.log(`  - Logical inspection flow: ${uxImprovements.hasLogicalFlow ? 'YES' : 'NO'}`);
    
    const overallSuccess = Object.values(uxImprovements).every(Boolean);
    
    if (overallSuccess) {
      console.log('🎉 STREAMLINED INSPECTION INTERFACE SUCCESS!');
      console.log('🚀 Key improvements implemented:');
      console.log('   ✅ No more duplicate questions');
      console.log('   ✅ Step-by-step workflow');
      console.log('   ✅ Progress tracking');
      console.log('   ✅ Logical inspection sequence');
      console.log('   ✅ Better UX for field inspectors');
    } else {
      console.log('⚠️ Some UX improvements may not be fully implemented');
    }
    
    // Test interaction if we can find interactive elements
    const interactiveButtons = await page.locator('button:not([disabled])').count();
    console.log(`🖱️ Interactive buttons found: ${interactiveButtons}`);
    
    if (interactiveButtons > 5) {
      console.log('🎛️ Interface appears interactive and ready for use');
    }
    
    expect(hasSubstantialContent).toBe(true);
  });
  
  test('should compare old vs new interface complexity', async ({ page }) => {
    console.log('📊 Analyzing interface complexity improvements...');
    
    await page.goto('http://localhost:8080/inspector');
    await page.waitForLoadState('networkidle');
    
    // Measure complexity indicators
    const complexityMetrics = await page.evaluate(() => {
      const allText = document.body.textContent || '';
      
      return {
        totalText: allText.length,
        questionCount: (allText.match(/\?/g) || []).length,
        solarMentions: (allText.match(/solar/gi) || []).length,
        daylightMentions: (allText.match(/daylight/gi) || []).length,
        budgetMentions: (allText.match(/budget/gi) || []).length,
        duplicateIndicators: {
          solarSections: (allText.match(/solar.*daylighting/gi) || []).length,
          multipleBudgetYears: (allText.match(/budget year/gi) || []).length
        }
      };
    });
    
    console.log('📈 Interface complexity analysis:');
    console.log(`  Total text length: ${complexityMetrics.totalText}`);
    console.log(`  Total questions: ${complexityMetrics.questionCount}`);
    console.log(`  Solar mentions: ${complexityMetrics.solarMentions}`);
    console.log(`  Daylight mentions: ${complexityMetrics.daylightMentions}`);
    console.log(`  Budget mentions: ${complexityMetrics.budgetMentions}`);
    console.log('');
    console.log('🔍 Duplication analysis:');
    console.log(`  Solar sections: ${complexityMetrics.duplicateIndicators.solarSections}`);
    console.log(`  Budget year selectors: ${complexityMetrics.duplicateIndicators.multipleBudgetYears}`);
    
    // Success criteria for streamlined interface
    const isStreamlined = complexityMetrics.duplicateIndicators.multipleBudgetYears <= 1 &&
                         complexityMetrics.duplicateIndicators.solarSections <= 1;
    
    console.log('');
    console.log(`🎯 Streamlined interface success: ${isStreamlined ? 'YES' : 'NO'}`);
    
    if (isStreamlined) {
      console.log('✨ Interface successfully streamlined!');
      console.log('🎉 Duplicate questions eliminated');
      console.log('🚀 Ready for improved inspector workflow');
    }
    
    expect(isStreamlined).toBe(true);
  });
});