"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowLeft, Shield, Lock, Scale } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function TermsAndConditionsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 animate-fade-in">
                        <Image src="/icons/favicon-32x32.png" alt="Buddhi AI Logo" width={32} height={32} />
                        <span className="text-2xl font-extralight leading-none"><strong className="font-bold">Buddhi</strong>AI</span>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            {/* Content */}
            <div className="pt-24 pb-16 px-4">
                <div className="container mx-auto max-w-4xl">
                    {/* Back Button */}
                    <div className="mb-8">
                        <Button asChild variant="outline" size="sm" className="animate-fade-in">
                            <Link href="/">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Home
                            </Link>
                        </Button>
                    </div>

                    {/* Hero Section */}
                    <div className="text-center mb-12 animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                            <Scale className="h-4 w-4" />
                            Legal Framework
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                            Terms and Conditions
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Governing the use of Buddhi AI&apos;s privacy-first, client-side AI platform
                        </p>
                    </div>

                    {/* Content Card */}
                    <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-8 md:p-12 shadow-xl animate-slide-in-up">
                        <div className="prose prose-lg max-w-none dark:prose-invert">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-primary mb-2">Buddhi AI: Terms and Conditions of Service</h2>
                                <p className="text-sm text-muted-foreground"><strong>Effective Date:</strong> 2025-11-25</p>
                            </div>

                            <div className="space-y-8">
                                {/* Section 1 */}
                                <section>
                                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">1</span>
                                        Acceptance of Terms
                                    </h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        By accessing or using the Buddhi AI application (the &quot;Service&quot;), you agree to be bound by these Terms and Conditions (&quot;Terms&quot;). If you disagree with any part of the terms, you may not access the Service. The Service is provided by <strong>Buddhilive Academy</strong> (or &quot;We,&quot; &quot;Us,&quot; &quot;Our&quot;).
                                    </p>
                                </section>

                                {/* Section 2 */}
                                <section>
                                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">2</span>
                                        Nature of the Service and Privacy Guarantee
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
                                            <h4 className="font-semibold text-primary mb-2">A. Client-Side Processing</h4>
                                            <p className="text-muted-foreground text-sm">
                                                Buddhi AI is a browser-based application utilizing client-side processing technology (Google MediaPipe, Gemma 3n E2B model) to perform AI inference, including chat, summarization, writing assistance, and image-to-text functionality.
                                            </p>
                                        </div>
                                        <div className="bg-green-500/5 p-4 rounded-lg border-l-4 border-green-500">
                                            <h4 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                                                <Shield className="h-4 w-4" />
                                                B. Data Privacy
                                            </h4>
                                            <p className="text-muted-foreground text-sm">
                                                <strong className="text-green-600">We do not receive, store, or process any of your personal data, prompts, images, or AI-generated output on our servers.</strong> All processing occurs locally on your device. Chat history is stored only in your browser&apos;s local storage (IndexedDB). Your agreement to these Terms acknowledges and relies upon this foundational privacy principle.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* Section 3 */}
                                <section>
                                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">3</span>
                                        User Accounts and Access
                                    </h3>
                                    <ul className="text-muted-foreground space-y-2 text-sm">
                                        <li>• You must be at least 13 years old to use the Service.</li>
                                        <li>• We reserve the right to modify or discontinue the Service (or any part or content thereof) without notice at any time.</li>
                                    </ul>
                                </section>

                                {/* Section 4 */}
                                <section>
                                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">4</span>
                                        User Responsibilities and Acceptable Use
                                    </h3>
                                    <p className="text-muted-foreground mb-3 text-sm">
                                        You agree not to use the Service to generate, process, or disseminate content that:
                                    </p>
                                    <ul className="text-muted-foreground space-y-2 text-sm">
                                        <li>• Is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, invasive of another&apos;s privacy, hateful, or racially, ethnically, or otherwise objectionable.</li>
                                        <li>• Violates the intellectual property or proprietary rights of any third party.</li>
                                        <li>• Encourages or instructs conduct that would constitute a criminal offense, give rise to civil liability, or otherwise violate any law.</li>
                                        <li>• Includes confidential, private, or sensitive information regarding others, as the output may not be filtered or monitored by Us.</li>
                                    </ul>
                                    <div className="bg-amber-500/5 p-4 rounded-lg border-l-4 border-amber-500 mt-4">
                                        <p className="text-amber-600 text-sm font-medium">
                                            <strong>Because processing occurs locally, you are solely responsible for all content, prompts, and images you input into the Service and the resulting output.</strong>
                                        </p>
                                    </div>
                                </section>

                                {/* Section 5 */}
                                <section>
                                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">5</span>
                                        Intellectual Property Rights
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-primary mb-2">A. Ownership of the Service</h4>
                                            <p className="text-muted-foreground text-sm">
                                                The Service, its original content, features, and functionality (excluding User Input and Output), and the underlying software and models (including the implementation of the Google MediaPipe Library and the Gemma 3n E2B model) are and will remain the exclusive property of Buddhilive Academy and its licensors.
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-primary mb-2">B. User Input and Output</h4>
                                            <p className="text-muted-foreground text-sm">
                                                You retain all intellectual property rights in the content you input (prompts, images) and the content generated by the Service specifically for you (&quot;Output&quot;). You grant us no license to this content, as it is processed locally and never transmitted to us.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* Section 6 */}
                                <section>
                                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">6</span>
                                        Disclaimer of Warranties
                                    </h3>
                                    <p className="text-muted-foreground mb-3 text-sm">
                                        The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis, without any warranties of any kind, express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
                                    </p>
                                    <div className="bg-red-500/5 p-4 rounded-lg border-l-4 border-red-500">
                                        <p className="text-red-600 text-sm font-medium mb-2">We do not warrant that:</p>
                                        <ul className="text-red-600 text-sm space-y-1">
                                            <li>• The Service will function uninterrupted, securely, or be available at any particular time or location.</li>
                                            <li>• The results generated from the use of the Service will be accurate, reliable, or free of errors.</li>
                                            <li>• The Output will be suitable for any specific legal, professional, or medical purpose.</li>
                                        </ul>
                                    </div>
                                </section>

                                {/* Section 7 */}
                                <section>
                                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">7</span>
                                        Limitation of Liability
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        In no event shall Buddhilive Academy, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any content obtained from the Service; and (iii) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory.
                                    </p>
                                </section>

                                {/* Section 8 */}
                                <section>
                                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">8</span>
                                        Governing Law and Jurisdiction
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        These Terms shall be governed and construed in accordance with the laws of The Democratic Socialist Republic of Sri Lanka, without regard to its conflict of law provisions.
                                    </p>
                                </section>

                                {/* Section 9 */}
                                <section>
                                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">9</span>
                                        Changes to Terms
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days&apos; notice before any new terms take effect. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
                                    </p>
                                </section>

                                {/* Section 10 */}
                                <section>
                                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">10</span>
                                        Contact Information
                                    </h3>
                                    <p className="text-muted-foreground text-sm mb-4">
                                        If you have any questions about these Terms, please contact us at:
                                    </p>
                                    <div className="bg-primary/5 p-4 rounded-lg text-center">
                                        <a 
                                            href="mailto:info@buddhilive.com" 
                                            className="text-primary font-medium hover:underline"
                                        >
                                            info@buddhilive.com
                                        </a>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="py-12 px-4 border-t border-border/50">
                <div className="container mx-auto text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Image src="/icons/favicon-32x32.png" alt="Buddhi AI Logo" width={32} height={32} />
                        <span className="text-2xl font-extralight leading-none"><strong className="font-bold">Buddhi</strong>AI</span>
                    </div>
                    <p className="text-muted-foreground mb-4">
                        Copyright &copy; {new Date().getFullYear()} Buddhilive Academy | The future of private, client-side intelligence.
                    </p>
                    <div className="flex justify-center gap-6">
                        <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="/terms-and-conditions" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Terms and Conditions
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}