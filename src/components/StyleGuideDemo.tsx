import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const StyleGuideDemo = () => {
  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Light Mode Style Guide Demo</h1>
        
        {/* Buttons Section */}
        <Card variant="hover" className="mb-8">
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
            <CardDescription>All the modern button styles from the style guide</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button>Default Button</Button>
              <Button variant="gradient">Gradient Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="destructive">Destructive Button</Button>
              <Button variant="link">Link Button</Button>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Button Sizes</h4>
              <div className="flex items-center gap-4">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">🎯</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>Standard card with shadow</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This is a default card with the new light mode styling.
              </p>
            </CardContent>
          </Card>

          <Card variant="hover">
            <CardHeader>
              <CardTitle>Hover Card</CardTitle>
              <CardDescription>Enhanced hover effects</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This card has enhanced hover animations and lift effects.
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
              <CardDescription>High elevation shadow</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This card has a prominent shadow for important content.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Badges Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Badge Variants</CardTitle>
            <CardDescription>Modern badge styles with improved contrast</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="gradient">Gradient</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Tab Components</CardTitle>
            <CardDescription>Modern tabs with gradient active states</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <h3 className="text-lg font-medium">Overview Tab</h3>
                <p className="text-muted-foreground">
                  This tab showcases the new gradient active state with smooth transitions.
                </p>
              </TabsContent>
              <TabsContent value="analytics" className="space-y-4">
                <h3 className="text-lg font-medium">Analytics Tab</h3>
                <p className="text-muted-foreground">
                  Notice the beautiful hover effects and active state styling.
                </p>
              </TabsContent>
              <TabsContent value="reports" className="space-y-4">
                <h3 className="text-lg font-medium">Reports Tab</h3>
                <p className="text-muted-foreground">
                  All tabs feature consistent branding with the primary green color.
                </p>
              </TabsContent>
              <TabsContent value="settings" className="space-y-4">
                <h3 className="text-lg font-medium">Settings Tab</h3>
                <p className="text-muted-foreground">
                  The tab styling follows the exact specifications from your style guide.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Key colors used in the light mode theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-full h-12 bg-primary rounded-lg mb-2"></div>
                <p className="text-xs font-medium">Primary (#22c55e)</p>
              </div>
              <div className="text-center">
                <div className="w-full h-12 bg-secondary rounded-lg mb-2"></div>
                <p className="text-xs font-medium">Secondary (#f1f5f9)</p>
              </div>
              <div className="text-center">
                <div className="w-full h-12 bg-muted rounded-lg mb-2"></div>
                <p className="text-xs font-medium">Muted (#f1f5f9)</p>
              </div>
              <div className="text-center">
                <div className="w-full h-12 bg-destructive rounded-lg mb-2"></div>
                <p className="text-xs font-medium">Destructive (#ef4444)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Usage Instructions</CardTitle>
            <CardDescription>How to use the new button classes and components</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Button Classes:</h4>
              <div className="bg-muted p-4 rounded-lg">
                <code className="text-sm">
                  {`<Button variant="gradient">Gradient Button</Button>`}<br/>
                  {`<Button variant="outline">Outline Button</Button>`}<br/>
                  {`<Button size="lg">Large Button</Button>`}
                </code>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Card Variants:</h4>
              <div className="bg-muted p-4 rounded-lg">
                <code className="text-sm">
                  {`<Card variant="hover">...</Card>`}<br/>
                  {`<Card variant="elevated">...</Card>`}
                </code>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Badge Variants:</h4>
              <div className="bg-muted p-4 rounded-lg">
                <code className="text-sm">
                  {`<Badge variant="gradient">Gradient Badge</Badge>`}<br/>
                  {`<Badge variant="success">Success Badge</Badge>`}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StyleGuideDemo;