# CASE Budget Product Specification

**Product:** CASE Budget  
**Company:** XilAire Technologies  
**Document Type:** Master Product Specification  
**Status:** Active  
**Version:** 0.1.0  
**Last Updated:** July 27, 2026  

---

# 1. Product Overview

CASE Budget is a mobile-first personal finance platform designed to help individuals, couples, and families manage their complete financial lives from one application.

CASE Budget is not intended to be only a budgeting application.

The long-term product vision is to become a personal financial operating system that brings together:

- Budgeting
- Bank accounts
- Credit cards
- Transactions
- Bills
- Reminders
- Savings
- Debt payoff
- Investments
- Net worth
- Financial reports
- Household collaboration
- Financial planning
- AI-powered insights

CASE Budget should provide users with a clear answer to the following questions:

- Where is my money?
- Where is my money going?
- What bills are due?
- What bills are past due?
- How much money is available?
- Am I staying within my budget?
- How much debt do I have?
- When will my debt be paid off?
- How are my savings goals progressing?
- What is my current net worth?
- How are my investments performing?
- Can I safely afford a purchase?
- What financial actions should I take next?

---

# 2. Product Positioning

## 2.1 Primary Positioning

CASE Budget should be positioned as:

> Your complete financial operating system.

## 2.2 Primary Marketing Message

> Manage your money. Build your future.

## 2.3 Supporting Message

CASE Budget brings budgeting, bills, savings, debt payoff, investments, and net worth together in one intelligent financial hub.

## 2.4 Product Differentiation

CASE Budget should differentiate itself from traditional budgeting applications through:

- Multiple connected financial institutions
- Multiple accounts per institution
- Household and family collaboration
- Role-based access and permissions
- Personal and shared financial spaces
- Advanced bill reminders
- Debt payoff planning
- Investment tracking
- Net-worth tracking
- Financial health scoring
- AI-powered financial insights
- Multiple financial workspaces
- Mobile-first functionality
- Premium financial planning features

---

# 3. Product Principles

All product and engineering decisions should follow these principles.

## 3.1 Mobile First

Every major feature must be fully functional on mobile devices.

Mobile should not be treated as a limited companion experience.

Users should be able to perform the following from a phone:

- Create and update budgets
- Review transactions
- Categorize transactions
- Split transactions
- Add manual transactions
- Review connected accounts
- Manage bills
- Mark bills as paid
- Receive reminders
- Update savings goals
- Review debt payoff progress
- Invite household members
- Approve household actions
- Review reports
- View investments
- View net worth
- Manage notifications

## 3.2 Component-Driven Development

Page and route files must remain small.

Reusable interface and feature logic must be moved into reusable components.

Shared logic should not be duplicated across pages.

## 3.3 Financial Clarity

Financial information should be easy to understand.

Users should not need accounting knowledge to understand:

- Income
- Spending
- Cash flow
- Debt
- Savings
- Net worth
- Budget performance

## 3.4 Privacy by Default

Personal financial information must remain private unless the user explicitly shares it.

Users must be able to separate:

- Personal accounts
- Shared household accounts
- Business accounts
- Other financial workspaces

## 3.5 Permission-Based Collaboration

Invited users should only see and manage the information they have permission to access.

Collaboration must not require users to share a password.

## 3.6 Explainable Automation

Automatic categorization, forecasting, and AI recommendations should explain why an action or recommendation was made.

## 3.7 User Control

Users should be able to override:

- Imported transaction categories
- Automatic rules
- Recurring transaction detection
- Suggested budgets
- Financial recommendations
- Account classifications

---

# 4. Target Users

## 4.1 Individual Users

Individuals who want to:

- Build a monthly budget
- Track spending
- Monitor bills
- Save toward financial goals
- Pay down debt
- Track net worth
- Connect multiple financial accounts

## 4.2 Couples

Couples who want to:

- Build a shared household budget
- Connect separate and joint accounts
- Share bill responsibilities
- Set shared savings goals
- Track household spending
- Keep selected accounts private
- Collaborate without sharing login credentials

## 4.3 Families

Families who want to:

- Manage a household budget
- Add multiple family members
- Track allowances
- Assign spending categories
- Create savings goals for children
- Approve certain purchases
- Restrict access based on family roles

## 4.4 Advanced Financial Users

Users who want:

- Multiple workspaces
- Investment tracking
- Net-worth reporting
- Advanced analytics
- Financial forecasting
- Custom categories
- Custom rules
- Data exports
- Financial document storage

## 4.5 Future Business Users

Future versions may support:

- Small businesses
- Rental properties
- Side businesses
- Independent contractors
- Family financial management
- Trust or estate tracking

Business functionality is not part of the initial product launch unless explicitly added to the active roadmap.

---

# 5. Account and Workspace Model

## 5.1 User Account

A user account represents one authenticated person.

Each person must have their own login.

A user may belong to multiple workspaces.

## 5.2 Workspace

A workspace is the primary boundary for financial data.

Examples include:

- Personal
- Household
- Family
- Business
- Rental Property
- Parent Support
- Shared Project

Each workspace can contain:

- Members
- Financial institutions
- Financial accounts
- Budgets
- Transactions
- Bills
- Goals
- Debts
- Investments
- Reports
- Notifications
- Activity history

## 5.3 Default Personal Workspace

Each new user should receive a personal workspace during onboarding.

The default workspace should be private.

## 5.4 Shared Household Workspace

A user may create a household workspace and invite another person.

Example:

```text
Calix Personal
Calix and Stephanie Household
XilAire Technologies
Rental Property