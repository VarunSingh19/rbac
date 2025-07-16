import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  insertConsultationRequestSchema,
  type InsertConsultationRequest,
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
  Shield,
  Globe,
  Smartphone,
  Server,
  CheckCircle,
  Star,
  Users,
  Clock,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  AlertTriangle,
  Lock,
  Target,
  TrendingUp,
  FileText,
  Zap,
  Menu,
  X,
} from "lucide-react";

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsertConsultationRequest>({
    resolver: zodResolver(insertConsultationRequestSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      service: "",
      description: "",
    },
  });

  const consultationMutation = useMutation({
    mutationFn: async (data: InsertConsultationRequest) => {
      return apiRequest("POST", "/api/consultation-request", data);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description:
          "Your consultation request has been submitted successfully. We'll get back to you soon.",
        variant: "default",
      });
      form.reset();
      setShowForm(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit consultation request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertConsultationRequest) => {
    consultationMutation.mutate(data);
  };

  const services = [
    {
      icon: Globe,
      title: "Web Application Security",
      description:
        "Comprehensive security testing for web applications, APIs, and portals",
      features: [
        "OWASP Top 10 Testing",
        "Authentication & Authorization",
        "Session Management",
        "Input Validation",
      ],
    },
    {
      icon: Smartphone,
      title: "Mobile App Security",
      description: "Security assessment for iOS and Android applications",
      features: [
        "Static & Dynamic Analysis",
        "API Security",
        "Data Storage",
        "Runtime Protection",
      ],
    },
    {
      icon: Server,
      title: "API Security Testing",
      description: "Thorough testing of REST APIs, GraphQL, and microservices",
      features: [
        "API Gateway Testing",
        "Rate Limiting",
        "Data Validation",
        "Authentication",
      ],
    },
    {
      icon: Lock,
      title: "Infrastructure Security",
      description: "Network and infrastructure security assessment",
      features: [
        "Network Penetration Testing",
        "Cloud Security",
        "Server Hardening",
        "Firewall Configuration",
      ],
    },
  ];

  const stats = [
    { icon: Users, value: "500+", label: "Clients Protected" },
    { icon: Shield, value: "99.9%", label: "Threat Detection Rate" },
    { icon: Clock, value: "24/7", label: "Security Monitoring" },
    { icon: CheckCircle, value: "1000+", label: "Vulnerabilities Fixed" },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CTO, TechCorp",
      content:
        "Their security testing helped us identify critical vulnerabilities before they became problems. Excellent service!",
      rating: 5,
    },
    {
      name: "Mike Chen",
      role: "Security Manager, StartupXYZ",
      content:
        "Professional, thorough, and reliable. They've been our trusted security partner for over 2 years.",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "IT Director, Enterprise Inc",
      content:
        "The detailed reports and actionable recommendations helped us improve our security posture significantly.",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CyBridge</h1>
                <p className="text-sm text-gray-600">
                  Cybersecurity Excellence
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a
                href="#services"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Services
              </a>
              <a
                href="#about"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                About
              </a>
              <a
                href="#testimonials"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Testimonials
              </a>
              <a
                href="#contact"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Contact
              </a>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Get Started
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden mt-4 pb-4 border-t border-gray-200">
              <div className="flex flex-col space-y-4 pt-4">
                <a
                  href="#services"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Services
                </a>
                <a
                  href="#about"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  About
                </a>
                <a
                  href="#testimonials"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Testimonials
                </a>
                <a
                  href="#contact"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Contact
                </a>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 w-full"
                >
                  Get Started
                </Button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Protect Your Business with
              <span className="text-blue-600"> World-Class Security</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              We provide comprehensive cybersecurity testing services to
              identify vulnerabilities and strengthen your digital defenses
              before attackers can exploit them.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => setShowForm(true)}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
              >
                Request Free Consultation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-blue-600 text-blue-600 hover:bg-blue-50 text-lg px-8 py-6"
              >
                View Our Services
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <stat.icon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Our Security Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive cybersecurity solutions tailored to protect your
              business from modern threats
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <Card
                key={index}
                className="group hover:shadow-xl transition-shadow duration-300"
              >
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 rounded-lg p-3 group-hover:bg-blue-600 transition-colors">
                      <service.icon className="h-8 w-8 text-blue-600 group-hover:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{service.title}</CardTitle>
                      <CardDescription className="text-gray-600">
                        {service.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className="flex items-center space-x-2"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Why Choose SecureGuard?
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-lg p-2">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Proven Expertise
                    </h3>
                    <p className="text-gray-600">
                      Our certified security professionals have years of
                      experience in identifying and mitigating cyber threats.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-lg p-2">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Cutting-Edge Tools
                    </h3>
                    <p className="text-gray-600">
                      We use the latest security testing tools and methodologies
                      to ensure comprehensive coverage.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-lg p-2">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Detailed Reports
                    </h3>
                    <p className="text-gray-600">
                      Receive comprehensive reports with actionable
                      recommendations and remediation steps.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    500+
                  </div>
                  <div className="text-gray-700">Projects Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    99.9%
                  </div>
                  <div className="text-gray-700">Client Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    24/7
                  </div>
                  <div className="text-gray-700">Support Available</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    5+
                  </div>
                  <div className="text-gray-700">Years Experience</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What Our Clients Say
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Don't just take our word for it - hear from satisfied clients who
              trust us with their security
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {testimonial.role}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Ready to secure your business? Contact us today for a free
              consultation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Email Us
              </h3>
              <p className="text-gray-600">contact@cybridge.com</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Phone className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Call Us
              </h3>
              <p className="text-gray-600">+1 (555) 123-4567</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Visit Us
              </h3>
              <p className="text-gray-600">
                123 Security St, Cyber City, CC 12345
              </p>
            </div>
          </div>

          <div className="text-center">
            <Button
              onClick={() => setShowForm(true)}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
            >
              Request Free Consultation
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-600 rounded-lg p-2">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">SecureGuard</h3>
                  <p className="text-sm text-gray-400">
                    Cybersecurity Excellence
                  </p>
                </div>
              </div>
              <p className="text-gray-400">
                Protecting businesses worldwide with comprehensive cybersecurity
                solutions.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Web Application Security</li>
                <li>Mobile App Security</li>
                <li>API Security Testing</li>
                <li>Infrastructure Security</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>About Us</li>
                <li>Our Team</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Security Policy</li>
                <li>Compliance</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SecureGuard. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Consultation Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    Request a Consultation
                  </CardTitle>
                  <CardDescription>
                    Fill out the form below and we'll get back to you within 24
                    hours
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      {...form.register("fullName")}
                      placeholder="John Doe"
                      className="mt-1"
                    />
                    {form.formState.errors.fullName && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                      placeholder="john@example.com"
                      className="mt-1"
                    />
                    {form.formState.errors.email && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      {...form.register("phone")}
                      placeholder="+1 (555) 123-4567"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      {...form.register("company")}
                      placeholder="Your Company Name"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    {...form.register("address")}
                    placeholder="123 Main St, City, State 12345"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="service">Service Required *</Label>
                  <Select
                    value={form.watch("service")}
                    onValueChange={(value) => form.setValue("service", value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web-app-security">
                        Web Application Security
                      </SelectItem>
                      <SelectItem value="mobile-app-security">
                        Mobile App Security
                      </SelectItem>
                      <SelectItem value="api-security">
                        API Security Testing
                      </SelectItem>
                      <SelectItem value="infrastructure-security">
                        Infrastructure Security
                      </SelectItem>
                      <SelectItem value="penetration-testing">
                        Penetration Testing
                      </SelectItem>
                      <SelectItem value="vulnerability-assessment">
                        Vulnerability Assessment
                      </SelectItem>
                      <SelectItem value="compliance-audit">
                        Compliance Audit
                      </SelectItem>
                      <SelectItem value="security-consultation">
                        Security Consultation
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.service && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.service.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Project Description *</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="Please describe your security requirements, current challenges, and what you're looking to achieve..."
                    className="mt-1 min-h-[100px]"
                  />
                  {form.formState.errors.description && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-gray-600">
                    All information is kept confidential and secure
                  </p>
                </div>

                <div className="flex space-x-4">
                  <Button
                    type="submit"
                    disabled={consultationMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 flex-1"
                  >
                    {consultationMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Request
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
